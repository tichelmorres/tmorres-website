import { Suspense, use, useLayoutEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import type { MdxComponents } from 'virtual:mdx-pages';
import NotFound from '@/app/NotFound';
import { findSlug, pagePath } from '@/lib/pages';
import { ENTRIES_PATH, entriesPagePath, entryPath, getPosts } from '@/lib/posts';
import { findMarks, getSearchIndex, preloadSearchIndex, search, type SearchResult } from '@/lib/search';
import { POSTS_PER_PAGE, useViewport } from '@/lib/viewport';
import Loading from '@/components/loading/Loading';
import RichText from '@/components/latex/RichText';
import Pagination from '@/components/pagination/Pagination';
import SearchBar from '@/components/searchbar/SearchBar';
import styles from './entries.module.css';

/*
    The  page asked in "?p=N".  No query is the first page.  The
    query  has  to be a whole number >= 1 without leading zeros,
    or  null  is returned.  It is not checked against the number
    of pages here.
*/
function parsePage(value: string | null): number | null {
    if (value === null) return 1;
    return /^[1-9]\d*$/.test(value) ? Number(value) : null;
}

// `text` with what matches the search words in <mark>
function Marked({ text, terms }: { text: string; terms: readonly string[] }): ReactElement {
    const parts: ReactNode[] = [];
    let at = 0;
    for (const [start, end] of findMarks(text, terms)) {
        if (start > at) parts.push(text.slice(at, start));
        parts.push(<mark key={start}>{text.slice(start, end)}</mark>);
        at = end;
    }
    parts.push(text.slice(at));
    return <>{parts}</>;
}

// Marked, but with the equations and dashes of the metadata
function MarkedRich({ text, terms }: { text: string; terms: readonly string[] }): ReactElement {
    return <RichText text={text} renderText={(piece) => <Marked text={piece} terms={terms} />} />;
}

interface SearchResultsProps {
    query   : string;
    terms   : readonly string[];
    visible : readonly SearchResult[];
    total   : number;
}

function SearchResults({ query, terms, visible, total }: SearchResultsProps): ReactElement {
    if (total === 0) {
        return <p role="status">Nenhum resultado para &ldquo;{query}&rdquo;.</p>;
    }

    return (
        <>
            <p role="status" className={styles.summary}>
                {total === 1 ? '1 resultado' : `${total} resultados`} para &ldquo;{query}&rdquo;
            </p>
            <ul className={styles.list}>
                {visible.map(({ kind, slug, title, date, snippet, snippetIsMetadata }) => (
                    <li key={`${kind}:${slug}`}>
                        <Link
                            to={kind === 'post' ? entryPath(slug) : pagePath(slug)}
                            className={styles.card}>
                            {date !== '' && (
                                <p className={styles.date}>
                                    <MarkedRich text={date} terms={terms} />
                                </p>
                            )}
                            <h2 className={styles.title}>
                                <MarkedRich text={title} terms={terms} />
                            </h2>
                            <p className={styles.description}>
                                {snippetIsMetadata ? (
                                    <MarkedRich text={snippet} terms={terms} />
                                ) : (
                                    <Marked text={snippet} terms={terms} />
                                )}
                            </p>
                        </Link>
                    </li>
                ))}
            </ul>
        </>
    );
}

function EntriesPage(): ReactElement {
    const posts = use(getPosts());
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const viewport = useViewport();

    // "?q="
    const query = (searchParams.get('q') ?? '').trim();
    const outcome = query === '' ? null : search(use(getSearchIndex()), query);

    // what is paginated? the results of the search, or the posts?
    const total = outcome ? outcome.results.length : posts.length;
    const perPage = POSTS_PER_PAGE[viewport];
    const pageCount = Math.max(1, Math.ceil(total / perPage));
    const page = parsePage(searchParams.get('p'));
    const valid = page !== null && page <= pageCount;

    /*
       Rotating  a  phone or resizing the window changes the number
       of posts per page, so a page that existed may stop existing.
       That is not the visitor's mistake, so we go to the last page
       instead of showing "not found".
    */
    const previousPerPage = useRef(perPage);
    useLayoutEffect(() => {
        const before = previousPerPage.current;
        if (before === perPage) return;
        previousPerPage.current = perPage;

        const pageCountBefore = Math.max(1, Math.ceil(total / before));
        if (page !== null && page <= pageCountBefore && page > pageCount) {
            void navigate(entriesPagePath(pageCount, query), { replace: true });
        }
    }, [perPage, page, pageCount, total, query, navigate]);

    // "?p=abc", "?p=0", "?p=999"...
    if (!valid) return <NotFound />;

    const from = (page - 1) * perPage;
    const to = page * perPage;

    return (
        <main>
            <SearchBar
                query={query}
                onSearch={(next) => void navigate(entriesPagePath(1, next))}
                onFocus={preloadSearchIndex}
            />
            {outcome ? (
                <SearchResults
                    query={query}
                    terms={outcome.terms}
                    visible={outcome.results.slice(from, to)}
                    total={total}
                />
            ) : posts.length === 0 ? (
                <p>Ainda não há postagens.</p>
            ) : (
                <ul className={styles.list}>
                    {posts.slice(from, to).map(({ slug, head, date, desc }) => (
                        <li key={slug}>
                            <Link to={entryPath(slug)} className={styles.card}>
                                {date !== undefined && (
                                    <p className={styles.date}><RichText text={date} /></p>
                                )}
                                <h2 className={styles.title}><RichText text={head} /></h2>
                                {desc !== undefined && (
                                    <p className={styles.description}><RichText text={desc} /></p>
                                )}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
            <Pagination
                current={page}
                total={pageCount}
                pathFor={(target) => entriesPagePath(target, query)}
            />
        </main>
    );
}

// "/postagens"
export default function Entries(): ReactElement {
    return (
        <Suspense fallback={<Loading />}>
            <EntriesPage />
        </Suspense>
    );
}

interface EntryViewProps {
    components: MdxComponents;
    fallback: ReactElement;
}

function hasPageBefore(): boolean {
    const state: unknown = window.history.state;
    if (typeof state !== 'object' || state === null || !('idx' in state)) return false;
    return typeof state.idx === 'number' && state.idx > 0;
}

function Post({ components, fallback }: EntryViewProps): ReactElement {
    const { slug } = useParams();
    const post = findSlug(use(getPosts()), slug);
    const navigate = useNavigate();

    if (!post) return fallback;

    const goBack = (): void => {
        if (hasPageBefore()) void navigate(-1);
        else void navigate(ENTRIES_PATH);
    };

    return (
        <main>
            <div className={styles.go}>
                <button type="button" className={styles.back} onClick={goBack}>
                    <span aria-hidden="true">&larr;</span> Voltar
                </button>
            </div>
            <post.Component components={components} />
        </main>
    );
}

// "/postagens/:slug"
export function EntryView(props: EntryViewProps): ReactElement {
    return (
        <Suspense fallback={<Loading />}>
            <Post {...props} />
        </Suspense>
    );
}
