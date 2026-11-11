import type { ComponentPropsWithoutRef, ReactElement } from 'react';
import styles from './code.module.css';

/*
    Replaces the <pre> of fenced code blocks (App.tsx):

        ```js
        const metadata = { head: "butter" };
        ```

    The  word after the three marks is the language.  It is read
    at build time by `rehype-highlight` (vite.config.ts).
*/
export default function Code(props: ComponentPropsWithoutRef<'pre'>): ReactElement {
    return <pre {...props} className={styles.code} role="group" aria-label="Código" tabIndex={0} />;
}
