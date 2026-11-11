/*
    Decides which buttons the pagination shows.

    See  MAX_PAGINATION_BUTTONS  in  src/app/viewport.ts for the
    sizes.

      - `max`  is  the most buttons shown at once, and it counts
        EVERY kind of "button": "Previous", "Next", page numbers
        and "...".

      - "Previous" is the first button, only if current > 1.

      - "Next" is the last button, only if current < total.

      - The first and the last page are always reachable.  "..."
        marks  pages that are not shown.
*/

export type PaginationItem =
    | { kind : 'previous'; page : number }
    | { kind : 'next';     page : number }
    | { kind : 'page';     page : number; current: boolean }
    | { kind : 'ellipsis'; key  : string };

// below this many buttons there is not enough room for "..."
const MIN_MAX_WITH_ELLIPSIS = 7;

function range(from: number, to: number): number[] {
    return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

// every page number that fits (no "...")
function windowed(current: number, total: number, slots: number): number[] {
    const size = Math.min(slots, total);
    const start = Math.min(Math.max(current - Math.floor((size - 1) / 2), 1), total - size + 1);
    return range(start, start + size - 1);
}

// page numbers and 'gap's, using exactly `slots` slots (slots >= 5 and total > slots)
function withGaps(current: number, total: number, slots: number): (number | 'gap')[] {
    let layout: (number | 'gap')[];

    if (current <= slots - 3) {
        // near the start: 1 2 3 4 ... last
        layout = [...range(1, slots - 2), 'gap', total];
    } else if (current >= total - slots + 4) {
        // near the end: 1 ... n-3 n-2 n-1 n
        layout = [1, 'gap', ...range(total - slots + 3, total)];
    } else {
        // in the middle: 1 ... c-1 c c+1 ... last
        const size = slots - 4;
        const start = current - Math.floor((size - 1) / 2);
        layout = [1, 'gap', ...range(start, start + size - 1), 'gap', total];
    }

    // a "..." that would hide exactly one page shows that page instead
    return layout.map((entry, index) => {
        if (entry !== 'gap') return entry;
        const before = layout[index - 1];
        const after = layout[index + 1];
        return typeof before === 'number' && typeof after === 'number' && after - before === 2
            ? before + 1
            : 'gap';
    });
}

export function buildPagination(current: number, total: number, max: number): PaginationItem[] {
    if (total <= 1) return [];

    const hasPrevious = current > 1;
    const hasNext = current < total;
    const slots = max - (hasPrevious ? 1 : 0) - (hasNext ? 1 : 0);

    let numbers: (number | 'gap')[];
    if (total <= slots || max < MIN_MAX_WITH_ELLIPSIS) {
        numbers = windowed(current, total, slots);
    } else {
        numbers = withGaps(current, total, slots);
    }

    let gaps = 0;
    return [
        ...(hasPrevious ? [{ kind: 'previous', page: current - 1 } as const] : []),
        ...numbers.map((entry): PaginationItem =>
            entry === 'gap'
                ? { kind: 'ellipsis', key: `gap-${gaps++}` }
                : { kind: 'page', page: entry, current: entry === current },
        ),
        ...(hasNext ? [{ kind: 'next', page: current + 1 } as const] : []),
    ];
}
