import { useLayoutEffect, type RefObject } from 'react';

/*
    Decides whether the pages are shown as the sidebar or as the
    dropdown   menu,   and   publishes  the  decision  as:

        <html data-nav="menu">

    If  it's  absent,  the result is "sidebar".  The stylesheets
    use  this  decision  instead  of  media  queries due to some
    inaccuracies.

    The menu is used when:

        - the screen is narrow (<= MENU_MAX_WIDTH), or
        - the sidebar is too short to hold
              the toggle
              + the pages
              + the social links
              + SOCIAL_CLEARANCE_REM
          without any visual clashes.

    The  height  needed  is  measured  from  the  real elements.
    Elements  are found by their data-fit attribute (see App.tsx
    and SocialLinks.tsx).
*/
const MENU_MAX_WIDTH = 768;        // px
const SOCIAL_CLEARANCE_REM = 0.75; // minimum space between the last page and the icons

const narrow = (): boolean => window.matchMedia(`(max-width: ${MENU_MAX_WIDTH}px)`).matches;

function sidebarFits(aside: HTMLElement, vortex: Element | null): boolean {
    const header = aside.querySelector<HTMLElement>('[data-fit="header"]');
    const pages = aside.querySelector<HTMLElement>('[data-fit="pages"]');
    const social = aside.querySelector<HTMLElement>('[data-fit="social"]');
    if (!header || !pages || !social) return true;

    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const asideCs = getComputedStyle(aside);
    const padTop = parseFloat(asideCs.paddingTop);
    const padBottom = parseFloat(asideCs.paddingBottom);
    const pagesPadBottom = parseFloat(getComputedStyle(pages).paddingBottom);

    // --vortex-h may not be updated yet when this runs, so the
    // vortex itself is read too
    const headerH = Math.max(header.offsetHeight, vortex?.getBoundingClientRect().height ?? 0);
    const listH = social.offsetHeight;
    const client = aside.clientHeight;

    const avail = client - padBottom;                  // bottom of the content box
    const end = padTop + headerH + pages.offsetHeight; // pages' bottom, no free space
    const free = avail - (end + headerH);              // what is left with the spacer

    let gap: number; // from the last page title to the top of the icons
    if (free >= 0) {
        gap = free / 2 + headerH + pagesPadBottom - listH;
    } else {
        const iconsBottom = Math.min(Math.max(avail, end), client);
        gap = iconsBottom - listH - (end - pagesPadBottom);
    }
    return gap >= SOCIAL_CLEARANCE_REM * rem;
}

export function useNavMode(
    asideRef: RefObject<HTMLElement | null>,
    watchRef: RefObject<Element | null>
): void {
    useLayoutEffect(() => {
        const root = document.documentElement;
        const aside = asideRef.current;
        if (!aside) return;

        const update = (): void => {
            let menu = narrow();
            if (!menu) {
                const was = root.dataset.nav;
                delete root.dataset.nav;
                menu = !sidebarFits(aside, watchRef.current);
                if (was !== undefined) root.dataset.nav = was;
            }
            if (menu) root.dataset.nav = 'menu';
            else delete root.dataset.nav;
        };

        update();
        window.addEventListener('resize', update);
        const observer = new ResizeObserver(update);
        observer.observe(aside);
        if (watchRef.current) observer.observe(watchRef.current);
        void document.fonts?.ready.then(update);

        return (): void => {
            window.removeEventListener('resize', update);
            observer.disconnect();
            delete root.dataset.nav;
        };
    }, [asideRef, watchRef]);
}
