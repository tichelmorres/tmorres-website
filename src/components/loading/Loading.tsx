import type { ReactElement } from 'react';
import styles from './loading.module.css';

const FRAMES = ['-', '\\', '|', '/'] as const;

export default function Loading(): ReactElement {
    return (
        <main className={styles.loading}>
            <p role="status" className={styles.text}>
                <span aria-hidden="true">
                    [
                    <span className={styles.spinner}>
                        <span className={styles.frames}>
                            {FRAMES.map((frame) => (
                                <span key={frame}>{frame}</span>
                            ))}
                        </span>
                    </span>
                    ]
                </span>
                {' '}Carregando...
            </p>
        </main>
    );
}
