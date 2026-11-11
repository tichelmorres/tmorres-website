import { pages } from './pages';
import { getPosts } from './posts';

/*
    Search  across  every MDX file.  The plain text of the files
    is  built  at  compile  time  (see  the `virtual:mdx-search`
    module of plugins/mdx-pages.ts).
*/

export type SearchKind = 'page' | 'post';

interface IndexedDocument {
    kind: SearchKind;
    slug: string;
    title: string;
    description: string;
    date: string;
    text: string;
    foldedTitle: string;
    foldedDescription: string;
    foldedDate: string;
    foldedText: string;
    // UTF-16 unit of foldedText
    textOrigin: Uint32Array;
}

export interface SearchIndex {
    available: boolean;
    documents: readonly IndexedDocument[];
}

export interface SearchResult {
    kind: SearchKind;
    slug: string;
    title: string;
    // only posts may have one
    date: string;
    snippet: string;
    // the snippet is the description of a post (metadata), not a piece of the body
    snippetIsMetadata: boolean;
}

export interface SearchOutcome {
    terms: string[];
    results: SearchResult[];
}

// ---- folding ------------------------------------------------

const ACCENTS = /[\u0300-\u036f]/g;

/*
    Text  becomes  lowercase,  without  Latin  accents  and with
    compatibility forms (like full-width) replaced.

    Japanese is kept apart on purpose.
*/
function fold(source: string): { text: string; origin: Uint32Array } {
    const parts: string[] = [];
    const origin: number[] = [];

    for (let index = 0; index < source.length; ) {
        const code = source.codePointAt(index)!;
        const char = String.fromCodePoint(code);
        const folded =
            code < 128
                ? char.toLowerCase()
                : char.normalize('NFKD').replace(ACCENTS, '').normalize('NFC').toLowerCase();

        parts.push(folded);
        for (let unit = 0; unit < folded.length; unit++) origin.push(index);
        index += char.length;
    }
    return { text: parts.join(''), origin: Uint32Array.from(origin) };
}

const MAX_TERMS = 8;

// "  Hello   WORLD " -> ['hello', 'world']
function toTerms(query: string): string[] {
    const words = fold(query).text.split(/\s+/).filter((word) => word !== '');
    return [...new Set(words)].slice(0, MAX_TERMS);
}

// ---- index --------------------------------------------------

function toIndexed(
    kind: SearchKind,
    slug: string,
    title: string,
    description: string,
    date: string,
    text: string,
): IndexedDocument {
    const body = fold(text);
    return {
        kind,
        slug,
        title,
        description,
        date,
        text,
        foldedTitle: fold(title).text,
        foldedDescription: fold(description).text,
        foldedDate: fold(date).text,
        foldedText: body.text,
        textOrigin: body.origin,
    };
}

async function buildIndex(): Promise<SearchIndex> {
    try {
        const [{ documents }, posts] = await Promise.all([
            import('virtual:mdx-search'),
            getPosts(),
        ]);
        const textOf = new Map(documents.map((doc) => [`${doc.kind}:${doc.slug}`, doc.text]));

        return {
            available: true,
            documents: [
                ...posts.map((post) =>
                    toIndexed(
                        'post',
                        post.slug,
                        post.head,
                        post.desc ?? '',
                        post.date ?? '',
                        textOf.get(`post:${post.slug}`) ?? '',
                    ),
                ),
                ...pages.map((page) =>
                    toIndexed('page', page.slug, page.title, '', '', textOf.get(`page:${page.slug}`) ?? ''),
                ),
            ],
        };
    } catch (error) {
        console.error('[search] the text of the pages could not be loaded.', error);
        return { available: false, documents: [] };
    }
}

let cache: Promise<SearchIndex> | undefined;

// built once when called
export function getSearchIndex(): Promise<SearchIndex> {
    cache ??= buildIndex();
    return cache;
}

/*
    Starts  loading  the  index, so that it is ready by the time
    something is searched.
*/
export function preloadSearchIndex(): void {
    void getSearchIndex();
}

// ---- searching ----------------------------------------------

const SNIPPET_LENGTH      = 160;
const SNIPPET_LEAD        = 50;
const MAX_COUNTED_MATCHES = 10;

const TITLE_SCORE       = 100;
const DATE_SCORE        = 200;
const DESCRIPTION_SCORE = 20;

function countMatches(haystack: string, term: string, from: number): number {
    let count = 0;
    for (
        let at = from;
        at !== -1 && count < MAX_COUNTED_MATCHES;
        at = haystack.indexOf(term, at + term.length)
    ) {
        count++;
    }
    return count;
}

function isLowSurrogate(text: string, index: number): boolean {
    const code = text.charCodeAt(index);
    return code >= 0xdc00 && code <= 0xdfff;
}

function snippetAround(text: string, at: number): string {
    let start = Math.max(0, at - SNIPPET_LEAD);
    if (start > 0) {
        const space = text.indexOf(' ', start);
        if (space !== -1 && space < at) start = space + 1;
        else if (isLowSurrogate(text, start)) start++;
    }

    let end = Math.min(text.length, start + SNIPPET_LENGTH);
    if (end < text.length) {
        const space = text.lastIndexOf(' ', end);
        if (space > at) end = space;
        else if (isLowSurrogate(text, end)) end--;
    }
    return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`;
}

function describe(doc: IndexedDocument, firstMatch: number): string {
    if (firstMatch >= 0) return snippetAround(doc.text, doc.textOrigin[firstMatch]);
    return doc.description !== '' ? doc.description : snippetAround(doc.text, 0);
}

/*
    Documents  that  contain  EVERY word of the query (part of a
    word is enough), comes first.
*/
export function search(index: SearchIndex, query: string): SearchOutcome {
    const terms = toTerms(query);
    if (terms.length === 0) return { terms, results: [] };

    const scored: { score: number; result: SearchResult }[] = [];

    for (const doc of index.documents) {
        let score = 0;
        let firstMatch = -1;
        let missing = false;

        for (const term of terms) {
            const inTitle = doc.foldedTitle.includes(term);
            const inDescription = doc.foldedDescription.includes(term);
            const inDate = doc.foldedDate.includes(term);
            const inText = doc.foldedText.indexOf(term);

            if (!inTitle && !inDescription && !inDate && inText === -1) {
                missing = true;
                break;
            }
            if (inTitle) score += TITLE_SCORE;
            if (inDescription) score += DESCRIPTION_SCORE;
            if (inDate) score += DATE_SCORE;
            if (inText !== -1) {
                score += countMatches(doc.foldedText, term, inText);
                if (firstMatch === -1 || inText < firstMatch) firstMatch = inText;
            }
        }
        if (missing) continue;

        scored.push({
            score,
            result: {
                kind: doc.kind,
                slug: doc.slug,
                title: doc.title,
                date: doc.date,
                snippet: describe(doc, firstMatch),
                snippetIsMetadata: firstMatch < 0 && doc.description !== '',
            },
        });
    }

    scored.sort((a, b) => b.score - a.score);
    return { terms, results: scored.map(({ result }) => result) };
}

/*
    Where  the  terms  are  in `text`, in order.  Used to <mark>
    them.
*/
export function findMarks(text: string, terms: readonly string[]): [number, number][] {
    const { text: folded, origin } = fold(text);
    const ranges: [number, number][] = [];

    for (const term of terms) {
        for (let at = folded.indexOf(term); at !== -1; at = folded.indexOf(term, at + term.length)) {
            const last = origin[at + term.length - 1];
            let next = at + term.length;
            while (next < origin.length && origin[next] === last) next++;
            ranges.push([origin[at], next < origin.length ? origin[next] : text.length]);
        }
    }

    ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const merged: [number, number][] = [];
    for (const range of ranges) {
        const previous = merged.at(-1);
        if (previous && range[0] <= previous[1]) previous[1] = Math.max(previous[1], range[1]);
        else merged.push([range[0], range[1]]);
    }
    return merged;
}
