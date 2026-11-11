import type { CSSProperties, ReactElement, ReactNode } from 'react';
import styles from './fontize.module.css';

interface FontizeProps {
    size: number | string;
    children?: ReactNode;
}

const valid = (size: unknown): size is number | string =>
    typeof size === 'number' ? Number.isFinite(size) && size > 0
    : typeof size === 'string' && size.trim() !== '';

/*
    Changes the font size of its content.
*/
export default function Fontize({ size, children }: FontizeProps): ReactElement {
    if (!valid(size)) {
        return (
            <>
                <span className={styles.error}>
                    Fontize error: size has to be a positive number or a CSS length
                </span>
                {children}
            </>
        );
    }

    const fontSize = typeof size === 'number' ? `${size}em` : size;
    return <span className={styles.fontize} style={{ fontSize } as CSSProperties}>{children}</span>;
}
