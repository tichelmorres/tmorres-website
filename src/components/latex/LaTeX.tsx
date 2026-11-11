import { lazy, Suspense, type ReactElement, type ReactNode } from 'react';
import styles from './latex.module.css';

// KaTeX is only downloaded by the pages that have an equation
const LaTeXRenderer = lazy(() => import('./LaTeXRenderer'));

interface LaTeXProps {
    children? : ReactNode;
    block?    : boolean;
}

export default function LaTeX({ children, block = false }: LaTeXProps): ReactElement {
    if (typeof children !== 'string') {
        return (
            <span className={styles.error}>
                LaTeX error: the equation has to be written as {'{String.raw`...`}'}
            </span>
        );
    }

    return (
        <Suspense fallback={null}>
            <LaTeXRenderer tex={children.trim()} block={block} />
        </Suspense>
    );
}
