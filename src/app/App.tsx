import { Suspense, useEffect, useId, useRef, useState, type ReactElement } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router';
import Vortex from '@/components/vortex/Vortex';
import MyAge from '@/components/myage/MyAge';
import Sidebar from '@/components/sidebar/Sidebar';
import Align from '@/components/align/Align';
import Fontize from '@/components/fontize/Fontize';
import Code from '@/components/code/Code';
import Highlight from '@/components/highlight/Highlight';
import Imagetic from '@/components/imagetic/Imagetic';
import Loading from '@/components/loading/Loading';
import LaTeX from '@/components/latex/LaTeX';
import MdxLink from '@/components/link/Link';
import MenuButton from '@/components/menubutton/MenuButton';
import Marginal from '@/components/marginal/Marginal';
import Rescale from '@/components/rescale/Rescale';
import SocialLinks from '@/components/sociallinks/SocialLinks';
import Table, { Td, Th } from '@/components/table/Table';
import ThemeToggle from '@/components/themetoggle/ThemeToggle';
import Entries, { EntryView } from '@/components/entries/Entries';
import { ENTRIES_PATH } from '../lib/posts';
import { useNavMode } from '../lib/navMode';
import { findPage, pagePath, pages, type Page } from '../lib/pages';
import NotFound from './NotFound';
import styles from './app.module.css';

const components = {
    Align,
    Fontize,
    MyAge,
    Highlight,
    Imagetic,
    LaTeX,
    Marginal,
    Rescale,
    a: MdxLink,
    table: Table,
    td: Td,
    th: Th,
    Table,
    Td,
    Th,
    pre: Code
};

// "/"
function Home(): ReactElement {
    if (pages.length === 0) {
        return <main><p>No MDX files found in <code>src/mdx-pages</code>.</p></main>;
    }
    return <Navigate to={pagePath(pages[0].slug)} replace />;
}

/*
    The  rendered MDX page.  Until its code arrives, the loading
    indicator takes the place of the <main> of the page.
*/
function PageMain({ page }: { page: Page }): ReactElement {
    return (
        <Suspense fallback={<Loading />}>
            <main>
                <page.Component components={components} />
            </main>
        </Suspense>
    );
}

// "/:slug"
function PageView(): ReactElement {
    const { slug } = useParams();
    const page = findPage(slug);

    return page ? <PageMain page={page} /> : <NotFound />;
}

function App(): ReactElement {
    const containerRef = useRef<HTMLDivElement>(null);
    const vortexBoxRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const asideRef = useRef<HTMLElement>(null);
    const menuId = useId();
    const [menuOpen, setMenuOpen] = useState(false);
    const { pathname, search, hash, key } = useLocation();

    // sidebar or dropdown menu, depending on the space available
    useNavMode(asideRef, vortexBoxRef);

    /*
       Copy  the  height of the vortex into --vortex-h.  The canvas
       is  symmetric  around the text, so the sidebar can use it to
       put  the  theme toggle at the vertical middle of the vortex.
       (Looks nicier)
    */
    useEffect(() => {
        const container = containerRef.current;
        const box = vortexBoxRef.current;
        if (!container || !box) return;

        const observer = new ResizeObserver(([entry]) => {
            container.style.setProperty('--vortex-h', `${entry.contentRect.height}px`);
        });
        observer.observe(box);
        return (): void => observer.disconnect();
    }, []);

    /*
       On  each  navigation,  close the menu and either jump to the
       heading in the URL hash or go back to the top, so that every
       page starts at the same place.
    */
    useEffect(() => {
        setMenuOpen(false);

        let id = hash.slice(1);
        try {
            id = decodeURIComponent(id);
        } catch {
            // use malformed escape as is
        }
        if (id === '') {
            window.scrollTo({ top: 0 });
            return;
        }

        const jump = (): boolean => {
            const target = document.getElementById(id);
            if (!target) return false;
            target.scrollIntoView();
            return true;
        };
        if (jump()) return;

        const observer = new MutationObserver(() => {
            if (jump()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        const timeout = window.setTimeout(() => observer.disconnect(), 15000); // wait 15s at max
        return (): void => {
            observer.disconnect();
            window.clearTimeout(timeout);
        };
    }, [pathname, search, hash, key]);

    // while the menu is open, Escape or a press outside of it closes it
    useEffect(() => {
        if (!menuOpen) return;

        const onKeyDown = (event: KeyboardEvent): void => {
            if (event.key === 'Escape') setMenuOpen(false);
        };
        const onPointerDown = (event: PointerEvent): void => {
            if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('pointerdown', onPointerDown);
        return (): void => {
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('pointerdown', onPointerDown);
        };
    }, [menuOpen]);

    return (
        <div className={styles.container} ref={containerRef}>
            <div className={styles.menu} ref={menuRef}>
                <MenuButton
                    open={menuOpen}
                    onToggle={() => setMenuOpen((open) => !open)}
                    controls={menuId}
                />
                <aside
                    ref={asideRef}
                    id={menuId}
                    className={menuOpen ? `${styles.sidebar} ${styles.open}` : styles.sidebar}>
                    <div className={styles.toggleRow} data-fit="header">
                        <ThemeToggle />
                    </div>
                    <div className={styles.pages} data-fit="pages">
                        <Sidebar />
                    </div>
                    <SocialLinks />
                </aside>
            </div>
            <div className={styles.content}>
                <div className={styles.column}>
                    <div ref={vortexBoxRef}>
                        <Vortex text="tichelmorres" />
                    </div>
                    <p className={styles.myage}>
                        Já se passaram <MyAge precision={15} /> anos...
                    </p>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path={ENTRIES_PATH} element={<Entries />} />
                        <Route
                            path={`${ENTRIES_PATH}/:slug`}
                            element={<EntryView components={components} fallback={<NotFound />} />}
                        />
                        <Route path="/:slug" element={<PageView />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </div>
            </div>
        </div>
    );
}

export default App;
