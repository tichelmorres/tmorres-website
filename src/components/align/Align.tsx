import type { ReactElement, ReactNode } from 'react';
import styles from './align.module.css';

export type Alignment = 'left' | 'center' | 'right';

export function isAlignment(value: unknown): value is Alignment {
    return value === 'left' || value === 'center' || value === 'right';
}

interface AlignProps {
    to: Alignment;
    children?: ReactNode;
}

export default function Align({ to, children }: AlignProps): ReactElement {
    const alignment = isAlignment(to) ? to : 'left';
    return (
        <div className={`${styles.align} ${styles[alignment]}`} data-align={alignment}>
            {children}
        </div>
    );
}
