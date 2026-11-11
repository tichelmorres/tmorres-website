import type { ReactElement } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import 'katex/contrib/copy-tex';
import './copyLatex';
import { checkLatex } from './latex';
import styles from './latex.module.css';

interface LaTeXRendererProps {
    tex: string;
    block: boolean;
}

// the HTML of the equation, or the reason why there is none
function render(tex: string, block: boolean): { html: string } | { error: string } {
    const problem = checkLatex(tex);
    if (problem !== null) return { error: problem };

    try {
        return {
            html: katex.renderToString(tex, {
                displayMode: block,
                throwOnError: true,
                // no \includegraphics, \href, \html*...
                trust: false,
                strict: 'ignore',
                maxExpand: 1000,
                maxSize: 10,
                // MathML for screen readers
                output: 'htmlAndMathml',
            }),
        };
    } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
    }
}

export default function LaTeXRenderer({ tex, block }: LaTeXRendererProps): ReactElement {
    const result = render(tex, block);

    if ('error' in result) {
        return <span className={styles.error}>LaTeX error: {result.error}</span>;
    }

    const className = block ? `${styles.latex} ${styles.block}` : styles.latex;
    return block ? (
        <div className={className} dangerouslySetInnerHTML={{ __html: result.html }} />
    ) : (
        <span className={className} dangerouslySetInnerHTML={{ __html: result.html }} />
    );
}
