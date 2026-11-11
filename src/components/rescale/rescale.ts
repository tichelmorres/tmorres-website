import { createContext, useContext } from 'react';

export interface RescaleSize {
    width  : number;
    height : number;
}

export const RescaleContext = createContext<RescaleSize | null>(null);

export function useRescale(): RescaleSize | null {
    return useContext(RescaleContext);
}

/*
    The pixels of a prop of <Rescale>.

        300     -> 300
        '300'   -> 300
        '300px' -> 300
        '1.5'   -> 1.5

    What  is  not  a positive size (0, negatives, NaN, Infinity,
    other units like '50%' or '2rem', text, ...) is `null`.
*/
export function parsePixels(value: unknown): number | null {
    const number =
        typeof value === 'string' && /^\s*(?:\d+\.?\d*|\.\d+)\s*(?:px)?\s*$/i.test(value)
            ? Number.parseFloat(value)
            : value;

    return typeof number === 'number' && Number.isFinite(number) && number > 0 ? number : null;
}
