import type { ComponentType } from 'react';
import { posts as entries, type MdxPostEntry } from 'virtual:mdx-posts';
import type { MdxPageProps } from 'virtual:mdx-pages';

export interface Post {
    slug      : string;
    head      : string;
    desc     ?: string;
    date     ?: string;
    Component : ComponentType<MdxPageProps>;
}

function isFilled(value: unknown): value is string {
    return typeof value === 'string' && value.trim() !== '';
}

async function toPost({ slug, fileName, load }: MdxPostEntry): Promise<Post | null> {
    let module: Awaited<ReturnType<MdxPostEntry['load']>>;
    try {
        module = await load();
    } catch (error) {
        console.warn(`[posts] "${fileName}" ignored: it could not be loaded.`, error);
        return null;
    }

    const metadata = module.metadata;
    const { head, desc, date } =
        typeof metadata === 'object' && metadata !== null
            ? (metadata as Record<string, unknown>)
            : {};

    if (!isFilled(head)) {
        console.warn(
            `[posts] "${fileName}" ignored: missing head in its ` +
            '`export const metadata = { head, desc?, date? }`.',
        );
        return null;
    }

    return {
        slug,
        head: head.trim(),
        desc: isFilled(desc) ? desc.trim() : undefined,
        date: isFilled(date) ? date.trim() : undefined,
        Component: module.default,
    };
}

let cache: Promise<readonly Post[]> | undefined;

/*
    Every post has to be loaded to read its metadata.  This runs
    once  the  first time the Entries section is visited.  Order
    is the one followed by virtual.modules.d.ts.
*/
export function getPosts(): Promise<readonly Post[]> {
    cache ??= Promise.all(entries.map(toPost)).then((posts) =>
        posts.filter((post): post is Post => post !== null),
    );
    return cache;
}

export const ENTRIES_PATH = '/postagens';

/*
    URL of a page (`?p=`) of Entries, with the search `query` if
    there is one (`?q=`).
*/
export function entriesPagePath(page: number, query = ''): string {
    const params = new URLSearchParams();
    if (query !== '') params.set('q', query);
    if (page > 1) params.set('p', String(page));

    const search = params.toString();
    return search === '' ? ENTRIES_PATH : `${ENTRIES_PATH}?${search}`;
}

export function entryPath(slug: string): string {
    return `${ENTRIES_PATH}/${encodeURIComponent(slug)}`;
}
