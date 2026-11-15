/*
    The number of a prop of <Layout>.

        2     -> 2
        '2'   -> 2
        ' 3 ' -> 3

    What  is  not  a  positive whole number (0, negatives, 1.5, NaN,
    Infinity, text, ...) is `null`.
*/
export function parseCount(value: unknown): number | null {
    const number =
        typeof value === 'string' && /^\s*\d+\s*$/.test(value)
            ? Number.parseInt(value, 10)
            : value;

    return typeof number === 'number' && Number.isSafeInteger(number) && number > 0 ? number : null;
}
