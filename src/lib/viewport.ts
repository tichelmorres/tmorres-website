import { useSyncExternalStore } from 'react';

/*
    Viewport  sizes  the  Entries page cares about.  They follow
    the columns of the entries list (see entries.module.css):

        - phone:             <= 600px,     1 column(s)
        - tablet:     601px  to 1024px,    2 column(s)
        - desktop:    1025px to 1920px,    2 column(s)
        - wide:              >= 1921px,    3 column(s)
*/
export type Viewport = 'phone' | 'tablet' | 'desktop' | 'wide';

const PHONE_QUERY  = '(max-width: 600px)';
const TABLET_QUERY = '(min-width: 601px) and (max-width: 1024px)';
const WIDE_QUERY   = '(min-width: 1921px)';

// posts shown by each page of Entries
export const POSTS_PER_PAGE: Record<Viewport, number> = {
    phone   : 6,
    tablet  : 10,
    desktop : 12,
    wide    : 12,
};

// most buttons shown at once by the pagination (see pagination.ts)
export const MAX_PAGINATION_BUTTONS: Record<Viewport, number> = {
    phone   : 3,
    tablet  : 7,
    desktop : 7,
    wide    : 9,
};

function subscribe(onChange: () => void): () => void {
    const lists = [PHONE_QUERY, TABLET_QUERY, WIDE_QUERY].map((query) => window.matchMedia(query));
    for (const list of lists) list.addEventListener('change', onChange);
    return (): void => {
        for (const list of lists) list.removeEventListener('change', onChange);
    };
}

function getViewport(): Viewport {
    if (window.matchMedia(PHONE_QUERY).matches)  return 'phone';
    if (window.matchMedia(TABLET_QUERY).matches) return 'tablet';
    if (window.matchMedia(WIDE_QUERY).matches)   return 'wide';
    return 'desktop';
}

export function useViewport(): Viewport {
    return useSyncExternalStore(subscribe, getViewport);
}
