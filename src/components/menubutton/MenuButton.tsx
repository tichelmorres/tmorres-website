import { useEffect, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';
import styles from './menubutton.module.css';

const currentRatio = (): number => (typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1);

/*
    Size  of  one device pixel in CSS pixels (1 / devicePixelRatio),
    kept  up  to  date  when  the  zoom level or the display scaling
    changes.   The stylesheet uses it to keep the hamburger lines on
    whole device pixels.
*/
function useDevicePixel(): string {
    const [ratio, setRatio] = useState(currentRatio);

    useEffect(() => {
        let query: MediaQueryList | undefined;

        const update = (): void => {
            query?.removeEventListener('change', update);
            const next = currentRatio();
            setRatio(next);
            query = window.matchMedia(`(resolution: ${next}dppx)`);
            query.addEventListener('change', update);
        };

        update();
        // zoom changes also fire resize, which covers more ratios
        window.addEventListener('resize', update);
        return () => {
            query?.removeEventListener('change', update);
            window.removeEventListener('resize', update);
        };
    }, []);

    return `${1 / ratio}px`;
}

interface MenuButtonProps {
    open: boolean;
    onToggle: () => void;
    controls: string;
}

export default function MenuButton({ open, onToggle, controls }: MenuButtonProps): ReactElement {
    const dpx = useDevicePixel();

    return (
        <button
            type="button"
            className={open ? `${styles.button} ${styles.open}` : styles.button}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
            aria-controls={controls}
            style={{ '--dpx': dpx } as CSSProperties}
            onClick={onToggle}>
            <span className={styles.line} />
            <span className={styles.line} />
            <span className={styles.line} />
        </button>
    );
}
