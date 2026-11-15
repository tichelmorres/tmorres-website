import { Children, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { parseCount } from './layout';
import styles from './layout.module.css';

interface LayoutProps {
    linum: number | string;
    count: number | string;
    children?: ReactNode;
}

/*
    Arranges  its children in lines, from left to right and from top
    to bottom, with at most `count` of them per line.

        <Layout linum={2} count={2}>
            <Rescale width={576} height={324}>
                <Imagetic path="img/flec/image.png" />
            </Rescale>
            ...
        </Layout>
*/
export default function Layout({ linum, count, children }: LayoutProps): ReactElement {
    const lines = parseCount(linum);
    const perLine = parseCount(count);

    if (lines === null || perLine === null) {
        return (
            <>
                <p className={styles.error}>
                    Layout error: linum and count have to be positive whole numbers
                </p>
                {children}
            </>
        );
    }

    // whitespace between the children is not an element
    const elements = Children.toArray(children).filter(
        (child) => !(typeof child === 'string' && child.trim() === ''),
    );

    const capacity = lines * perLine;
    const overflow = elements.length > capacity;
    const columns = Math.min(perLine, Math.max(elements.length, 1));

    return (
        <>
            {overflow ? (
                <p className={styles.error}>
                    Layout error: {elements.length} elements do not fit in {lines} {lines === 1 ? 'line' : 'lines'} of{' '}
                    {perLine}; the extra ones were put in more lines
                </p>
            ) : null}
            <div className={styles.layout} style={{ '--columns': columns } as CSSProperties}>
                {elements.map((element, index) => (
                    <div key={index} className={styles.element}>
                        {element}
                    </div>
                ))}
            </div>
        </>
    );
}
