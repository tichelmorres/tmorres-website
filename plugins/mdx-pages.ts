import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import type { Plugin, ViteDevServer } from 'vite'
import { mdxToText } from './mdx-text.ts'

/*
    Exposes  every `*.mdx` file found (non-recursively) in `dir`
    as  the  virtual  module  `virtual:mdx-pages`.   (Posts  are
    searched recursively.)

        export const pages = [
            {
                slug: 'about',
                title: 'About',
                load: () => import('/abs/About.mdx')
            },
            ...
        ]

    Duplicates
    Two  files  are  duplicates  when  their slugified names are
    equal  (e.g.   `About.mdx` and `about.mdx`, or `my page.mdx`
    and `my-page.mdx`).  Only the OLDEST of them is kept and the
    others are ignored.

    "Oldest"  means  the  earliest creation time.  When the file
    system  does  not  report one, the modification time is used
    instead.   If  two  files are still tied, the one whose file
    name   sorts   first   wins,   so   the   result  is  always
    deterministic.

    Order
    Pages  are  sorted  by  the  zero-based index each file must
    declare (anywhere in the file):

        export const index = 0

    The   smallest  index  comes  first;  indexes  need  not  be
    contiguous.  When two pages declare the same index, only the
    OLDEST  is  kept.  A page without a valid index is kept, but
    placed after the indexed ones, sorted by slug, and a warning
    is emitted.

    Posts
    Every  `*.mdx` file of `postsDir`, including the ones in its
    subfolders  at  any  depth, is exposed as the virtual module
    `virtual:mdx-posts`, sorted by creation time (newest first).
    The name of the subfolders is irrelevant.

        export const posts = [
            {
                slug: 'my-post',
                fileName: 'math/My Post.mdx',
                load: () => import('/abs/My Post.mdx')
            },
            ...
        ]

    Posts  are  never  part of `pages`.  The same duplicate rule
    applies  to  them,  even  when  the  files  are in different
    folders  (`a/Post.mdx`  and  `b/post.mdx`  are  duplicates).
    Their    `metadata`    is    validated   at   runtime   (see
    src/app/posts.ts)  because  it lives inside the compiled MDX
    module.

    Search
    The  plain  text (see mdx-text.ts) of every page and post is
    exposed as the virtual module `virtual:mdx-search`.

        export const documents = [
            {
                kind: 'post',
                slug: 'my-post',
                text: 'Hello, world This post is...'
            },
            {
                kind: 'page',
                slug: 'about',
                text: 'About Hi, I am...'
            },
            ...
        ]

    The app imports it lazily (see src/app/search.ts).
*/

const VIRTUAL_ID = 'virtual:mdx-pages'
const RESOLVED_ID = `\0${VIRTUAL_ID}`
const EXTENSION = '.mdx'
const POSTS_VIRTUAL_ID = 'virtual:mdx-posts'
const POSTS_RESOLVED_ID = `\0${POSTS_VIRTUAL_ID}`
const SEARCH_VIRTUAL_ID = 'virtual:mdx-search'
const SEARCH_RESOLVED_ID = `\0${SEARCH_VIRTUAL_ID}`
// URL prefix of the posts, only used in warnings.
// Keep in sync with App.tsx.
const POSTS_URL_PREFIX = '/postagens/'

export interface MdxPagesOptions {
    dir: string
    postsDir?: string
}

interface PageFile {
    fileName: string
    file: string
    title: string
    slug: string
    createdAt: number
    index: number | null
}

// `export const index = 0` at the start of a line
const INDEX_PATTERN = /^export\s+const\s+index\s*=\s*(\d+)\s*;?\s*$/m

function readIndex(file: string): number | null {
    const match = INDEX_PATTERN.exec(readFileSync(file, 'utf8'))
    return match ? Number(match[1]) : null
}

/*
    `"My  Page_One.mdx"` -> `"my-page-one"`.  Letters and digits
    of  any  script  are kept (i.e.  Japanese names still work),
    accents  are  kept too, and everything else becomes a single
    `-`.  Lookups are also accent-insensitive, see `findSlug` in
    src/lib/pages.ts.
*/
export function slugify(text: string): string {
    return text
        .normalize('NFKC')
        .toLowerCase()
        .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '')
}

function isPageFileName(fileName: string): boolean {
    return fileName.endsWith(EXTENSION) && !fileName.startsWith('.')
}

/*
    Lists  the  `*.mdx`  files  of `dir`.  With `recursive`, the
    files  of  every  subfolder  are listed too (hidden folders,
    i.e. starting with a dot, are skipped).
*/
function scan(dir: string, withIndex = false, recursive = false): PageFile[] {
    if (!existsSync(dir)) return []

    const files: PageFile[] = []

    const walk = (current: string, prefix: string): void => {
        const entries = readdirSync(current, { withFileTypes: true })
            .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))

        for (const entry of entries) {
            if (entry.isDirectory()) {
                if (recursive && !entry.name.startsWith('.')) {
                    walk(path.join(current, entry.name), `${prefix}${entry.name}/`)
                }
                continue
            }
            if (!entry.isFile() || !isPageFileName(entry.name)) continue

            const file = path.join(current, entry.name)
            const { birthtimeMs, mtimeMs } = statSync(file)
            const title = entry.name.slice(0, -EXTENSION.length)

            files.push({
                fileName: `${prefix}${entry.name}`,
                file,
                title,
                slug: slugify(title),
                createdAt: birthtimeMs > 0 ? birthtimeMs : mtimeMs,
                index: withIndex ? readIndex(file) : null,
            })
        }
    }

    walk(dir, '')
    return files
}

function oldestFirst(a: PageFile, b: PageFile): number {
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt
    return a.fileName < b.fileName ? -1 : 1
}

function resolvePages(
    files: PageFile[],
    urlPrefix = '/',
): { pages: PageFile[]; warnings: string[] } {
    const warnings: string[] = []
    const groups = new Map<string, PageFile[]>()

    for (const file of files) {
        if (file.slug === '') {
            warnings.push(`"${file.fileName}" ignored: its name has no letters or digits to build a URL from.`)
            continue
        }
        const group = groups.get(file.slug)
        if (group) group.push(file)
        else groups.set(file.slug, [file])
    }

    const pages: PageFile[] = []
    for (const group of groups.values()) {
        group.sort(oldestFirst)
        const [oldest, ...duplicates] = group
        pages.push(oldest)
        for (const duplicate of duplicates) {
            warnings.push(
                `"${duplicate.fileName}" ignored: "${oldest.fileName}" is older and has the same URL (${urlPrefix}${oldest.slug}).`,
            )
        }
    }

    pages.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    return { pages, warnings }
}

/*
    Applies the manual index rules to pages already deduplicated
    by slug (see `resolvePages`).
*/
function orderPages(files: PageFile[]): { pages: PageFile[]; warnings: string[] } {
    const warnings: string[] = []
    const byIndex = new Map<number, PageFile[]>()
    const unindexed: PageFile[] = []

    for (const file of files) {
        if (file.index === null) {
            warnings.push(`\"${file.fileName}\" has no valid \`export const index = N\`: placed last.`)
            unindexed.push(file)
            continue
        }
        const group = byIndex.get(file.index)
        if (group) group.push(file)
        else byIndex.set(file.index, [file])
    }

    const indexed: PageFile[] = []
    for (const [index, group] of byIndex) {
        group.sort(oldestFirst)
        const [oldest, ...duplicates] = group
        indexed.push(oldest)
        for (const duplicate of duplicates) {
            warnings.push(
                `\"${duplicate.fileName}\" ignored: \"${oldest.fileName}\" is older and has the same index (${index}).`,
            )
        }
    }

    indexed.sort((a, b) => (a.index as number) - (b.index as number))
    unindexed.sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    return { pages: [...indexed, ...unindexed], warnings }
}

function resolveSidebarPages(dir: string): { pages: PageFile[]; warnings: string[] } {
    const slugs = resolvePages(scan(dir, true))
    const ordered = orderPages(slugs.pages)
    return { pages: ordered.pages, warnings: [...slugs.warnings, ...ordered.warnings] }
}

function newestFirst(a: PageFile, b: PageFile): number {
    if (a.createdAt !== b.createdAt) return b.createdAt - a.createdAt
    return a.fileName < b.fileName ? -1 : 1
}

export default function mdxPages({ dir, postsDir: postsDirOption }: MdxPagesOptions): Plugin {
    const pagesDir = path.resolve(dir)
    const postsDir = path.resolve(postsDirOption ?? path.join(dir, 'posts'))

    return {
        name: 'mdx-pages',

        resolveId(id: string): string | undefined {
            if (id === VIRTUAL_ID) return RESOLVED_ID
            if (id === POSTS_VIRTUAL_ID) return POSTS_RESOLVED_ID
            if (id === SEARCH_VIRTUAL_ID) return SEARCH_RESOLVED_ID
            return undefined
        },

        load(id: string): string | undefined {
            if (id === SEARCH_RESOLVED_ID) {
                const documents = [
                    ...resolvePages(scan(postsDir, false, true), POSTS_URL_PREFIX).pages.sort(newestFirst).map((file) => ({ kind: 'post', file })),
                    ...resolveSidebarPages(pagesDir).pages.map((file) => ({ kind: 'page', file })),
                ].map(({ kind, file }) => {
                    // rebuilds the module when the file is edited
                    this.addWatchFile(file.file)
                    return { kind, slug: file.slug, text: mdxToText(readFileSync(file.file, 'utf8')) }
                })
                return `export const documents = ${JSON.stringify(documents)}\n`
            }

            if (id === POSTS_RESOLVED_ID) {
                const { pages: postFiles, warnings } = resolvePages(scan(postsDir, false, true), POSTS_URL_PREFIX)
                for (const warning of warnings) this.warn(`[mdx-pages] ${warning}`)

                const items = postFiles.sort(newestFirst).map(({ slug, fileName, file }) => {
                    const specifier = file.split(path.sep).join('/')
                    return `    { slug: ${JSON.stringify(slug)}, fileName: ${JSON.stringify(fileName)}, load: () => import(${JSON.stringify(specifier)}) }`
                })
                return `export const posts = [\n${items.join(',\n')}\n]\n`
            }

            if (id !== RESOLVED_ID) return undefined

            const { pages, warnings } = resolveSidebarPages(pagesDir)
            for (const warning of warnings) this.warn(`[mdx-pages] ${warning}`)

            const toEntry = ({ slug, title, file }: PageFile): string => {
                const specifier = file.split(path.sep).join('/')
                return `{ slug: ${JSON.stringify(slug)}, title: ${JSON.stringify(title)}, load: () => import(${JSON.stringify(specifier)}) }`
            }

            const items = pages.map((page) => `    ${toEntry(page)}`)
            return `export const pages = [\n${items.join(',\n')}\n]\n`
        },

        // Adding  or  deleting an .mdx file changes the list of pages,
        // so the virtual module has to be regenerated.
        configureServer(server: ViteDevServer): void {
            server.watcher.add([pagesDir, postsDir])

            const invalidateSearch = (): void => {
                const environment = server.environments.client
                const searchModule = environment.moduleGraph.getModuleById(SEARCH_RESOLVED_ID)
                if (searchModule) environment.moduleGraph.invalidateModule(searchModule)
            }

            // true for `postsDir` and everything below it
            const isInPosts = (fileDir: string): boolean => {
                const relative = path.relative(postsDir, fileDir)
                return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
            }

            const onFileListChange = (file: string): void => {
                const fileDir = path.resolve(path.dirname(file))
                const moduleId =
                    fileDir === pagesDir ? RESOLVED_ID : isInPosts(fileDir) ? POSTS_RESOLVED_ID : null
                if (moduleId === null) return
                if (!isPageFileName(path.basename(file))) return

                const environment = server.environments.client
                const virtualModule = environment.moduleGraph.getModuleById(moduleId)
                if (virtualModule) environment.moduleGraph.invalidateModule(virtualModule)
                invalidateSearch()
                environment.hot.send({ type: 'full-reload' })
            }

            // Editing  a  file is handled by the HMR of that file, but the
            // search  text  is built from it too.  It is only invalidated,
            // i.e. no reload.
            const onFileEdit = (file: string): void => {
                const fileDir = path.resolve(path.dirname(file))
                if (fileDir !== pagesDir && !isInPosts(fileDir)) return
                if (!isPageFileName(path.basename(file))) return
                invalidateSearch()
            }

            server.watcher.on('add', onFileListChange)
            server.watcher.on('unlink', onFileListChange)
            server.watcher.on('change', onFileEdit)
        },
    }
}
