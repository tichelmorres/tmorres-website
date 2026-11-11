import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { pages as entries, type MdxPageEntry, type MdxPageProps } from 'virtual:mdx-pages';

export interface Page {
    slug: string;
    title: string;
    Component: LazyExoticComponent<ComponentType<MdxPageProps>>;
}

function toPage({ slug, title, load }: MdxPageEntry): Page {
    return { slug, title, Component: lazy(load) };
}

export const pages: readonly Page[] = entries.map(toPage);

/*
    Accent-insensitive form of a slug, used only as a fallback.
*/
function fold(slug: string): string {
    return slug.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').normalize('NFC').toLowerCase();
}

/*
    Finds  the  item whose slug is `slug`.  An exact match wins.
    Otherwise,  the  first item whose slug is equal but ignoring
    accents.
*/
export function findSlug<T extends { slug: string }>(items: readonly T[], slug: string | undefined): T | undefined {
    if (slug === undefined) return undefined;
    const exact = slug.normalize('NFKC').toLowerCase();
    const folded = fold(slug);
    return items.find((item) => item.slug === exact)
        ?? items.find((item) => fold(item.slug) === folded);
}

export function findPage(slug: string | undefined): Page | undefined {
    return findSlug(pages, slug);
}

// Stupid
export function pagePath(slug: string): string {
    return `/${encodeURIComponent(slug)}`;
}
