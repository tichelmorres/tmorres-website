import { useEffect, useRef, useState, useSyncExternalStore, type ReactElement } from 'react';
import styles from './myage.module.css';

// December 1st of 2006 (the month is 0-based)
const BIRTH_YEAR  = 2006;
const BIRTH_MONTH = 11;
const BIRTH_DAY   = 1;

/*
    When  the  last  digit  changes  faster than this the age is
    drawn  once  per  screen  refresh.  Otherwise a timer sleeps
    until the exact moment of the next change.
*/
const FRAME_MS = 16;

/*
    setTimeout  stores  its delay in a signed 32 bit integer.  A
    longer  one  (24.8 days) fires at once instead.  With 0 or 1
    digits the wait is months.
*/
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/*
    Users  who  ask  for  reduced motion get the whole age only,
    i.e. PRECISION 0 so nothing flickers.
*/
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

interface Mode {
    digits    : number;
    scale     : bigint;
    frameSpan : bigint;
}

const makeMode = (digits: number): Mode => {
    const scale = 10n ** BigInt(digits);
    return { digits, scale, frameSpan: BigInt(FRAME_MS) * scale };
};

function subscribeReducedMotion(onChange: () => void): () => void {
    const query = window.matchMedia(REDUCED_MOTION);
    query.addEventListener('change', onChange);
    return (): void => query.removeEventListener('change', onChange);
}

const reducedMotionNow = (): boolean => window.matchMedia(REDUCED_MOTION).matches;

const birthday = (age: number): number =>
    new Date(BIRTH_YEAR + age, BIRTH_MONTH, BIRTH_DAY).getTime();

interface Year {
    years    : number;
    start    : number;
    end      : number;
    span     : bigint;
    perFrame : boolean;
}

function yearAt(now: number, { frameSpan }: Mode): Year {
    let years = new Date(now).getFullYear() - BIRTH_YEAR;
    if (now < birthday(years)) years--;

    const start = birthday(years);
    const end = birthday(years + 1);
    const span = BigInt(end - start);
    return { years, start, end, span, perFrame: span <= frameSpan };
}

// the fraction as a whole number of 10^-DIGITS
const unitsAt = (year: Year, now: number, { scale }: Mode): bigint =>
    (BigInt(now - year.start) * scale) / year.span;

const format = (year: Year, units: bigint, { digits }: Mode): string =>
    digits === 0 ? `${year.years}` : `${year.years},${units.toString().padStart(digits, '0')}`;

/*
    The  next unit starts at (units + 1) * span / SCALE ms after
    the birthday (the next birthday, when it is the last unit of
    the year). Rounded up to a whole millisecond.
*/
const nextChangeAt = (year: Year, units: bigint, { scale }: Mode): number =>
    year.start + Number(((units + 1n) * year.span + scale - 1n) / scale);

interface MyAgeProps {
    precision: number;
}

export default function MyAge({ precision }: MyAgeProps): ReactElement {
    const valueRef = useRef<HTMLSpanElement>(null);
    const reduceMotion = useSyncExternalStore(subscribeReducedMotion, reducedMotionNow, () => false);
    const digits = reduceMotion ? 0 : Math.max(0, Math.floor(precision));

    /*
       React  draws the age once.  The effect below then writes the
       new ones the text node.
    */
    const [initial] = useState(() => {
        const mode = makeMode(digits);
        const now = Date.now();
        const year = yearAt(now, mode);
        return format(year, unitsAt(year, now, mode), mode);
    });

    useEffect(() => {
        const node = valueRef.current?.firstChild;
        if (!node) return;

        const mode = makeMode(digits);
        let raf = 0;
        let timer = 0;
        let year = yearAt(Date.now(), mode);
        let shown = node.nodeValue;

        const update = (): void => {
            const now = Date.now();
            if (now >= year.end) year = yearAt(now, mode);

            const units = unitsAt(year, now, mode);
            const text = format(year, units, mode);
            if (text !== shown) {
                node.nodeValue = text;
                shown = text;
            }

            if (year.perFrame) {
                raf = requestAnimationFrame(update);
            } else {
                const wait = nextChangeAt(year, units, mode) - now;
                timer = window.setTimeout(update, Math.min(wait, MAX_TIMEOUT_MS));
            }
        };
        update();

        return (): void => {
            cancelAnimationFrame(raf);
            clearTimeout(timer);
        };
    }, [digits]);

    return <span className={styles.value} ref={valueRef}>{initial}</span>;
}
