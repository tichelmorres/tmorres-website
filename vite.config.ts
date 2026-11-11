import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import mdx from '@mdx-js/rollup'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import remarkDashes from './plugins/remark-dashes.ts'
import remarkLatex from './plugins/remark-latex.ts'
import remarkTableCells from './plugins/remark-table-cells.ts'
import remarkUnderline from './plugins/remark-underline.ts'
import rehypeHighlight from 'rehype-highlight'
import rehypeSlug from 'rehype-slug'
import path from 'node:path'
import mdxPages from './plugins/mdx-pages.ts'
import mdxMetadataRaw from './plugins/mdx-metadata-raw.ts'
import mdxBlockTags from './plugins/mdx-block-tags.ts'
import mdxTables from './plugins/mdx-tables.ts'

const dirname = import.meta.dirname

const root = path.resolve(dirname, 'src/app')

export default defineConfig({
    root,
    publicDir: path.resolve(dirname, 'public'),
    envDir: dirname,
    build: {
        outDir: path.resolve(dirname, 'dist'),
        emptyOutDir: true,
        rollupOptions: {
            input: path.resolve(root, 'index.html'),
        },
    },
    plugins: [
        // only useful in development
        {
            name: 'watch-media-dirs',
            configureServer(server) {
                server.watcher.add(['img', 'gif', 'vid'].map((folder) => path.resolve(dirname, 'src/assets', folder)))
            },
        },

        mdxPages({ dir: path.resolve(dirname, 'src/mdx-pages') }),
        mdxTables(),
        mdxBlockTags(),
        mdxMetadataRaw(),
        // MDX must run before the React plugin (see the @mdx-js/rollup docs).
        {
            enforce: 'pre',
            ...mdx({
                remarkPlugins: [remarkGfm, remarkMath, remarkDashes, remarkLatex, remarkUnderline, remarkTableCells],
                rehypePlugins: [rehypeSlug, [rehypeHighlight, { ignoreMissing: true }]],
            }),
        },
        // `include` adds Fast Refresh to .mdx files (see the plugin-react docs).
        react({ include: /\.(mdx|js|jsx|ts|tsx)$/ }),
        babel({ presets: [reactCompilerPreset()] })
    ],
    resolve: {
        alias: { '@': path.resolve(dirname, 'src') },
    },
})
