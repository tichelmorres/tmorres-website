import type { ReactElement } from 'react';
import { Link } from 'react-router';
import { MAX_PAGINATION_BUTTONS, useViewport } from '@/lib/viewport';
import { buildPagination } from './pagination';
import styles from './pagination.module.css';

interface PaginationProps {
    current : number;
    total   : number;
    pathFor : (page: number) => string;
}

export default function Pagination({ current, total, pathFor }: PaginationProps): ReactElement | null {
    const max = MAX_PAGINATION_BUTTONS[useViewport()];
    const items = buildPagination(current, total, max);

    if (items.length === 0) return null;

    return (
        <nav aria-label="Paginação" className={styles.nav}>
            <ul className={styles.list}>
                {items.map((item) => {
                    switch (item.kind) {
                        case 'previous':
                            return (
                                <li key="previous" className={styles.item}>
                                    <Link
                                        to={pathFor(item.page)}
                                        rel="prev"
                                        className={`${styles.button} ${styles.wide}`}>
                                        Anterior
                                    </Link>
                                </li>
                            );
                        case 'next':
                            return (
                                <li key="next" className={styles.item}>
                                    <Link
                                        to={pathFor(item.page)}
                                        rel="next"
                                        className={`${styles.button} ${styles.wide}`}>
                                        Próxima
                                    </Link>
                                </li>
                            );
                        case 'ellipsis':
                            return (
                                <li key={item.key} className={styles.item}>
                                    <span className={`${styles.button} ${styles.passive}`}>...</span>
                                </li>
                            );
                        case 'page':
                            return (
                                <li key={`page-${item.page}`} className={styles.item}>
                                    {item.current ? (
                                        <span
                                            aria-current="page"
                                            className={`${styles.button} ${styles.passive}`}>
                                            {item.page}
                                        </span>
                                    ) : (
                                        <Link
                                            to={pathFor(item.page)}
                                            aria-label={`Página ${item.page}`}
                                            className={styles.button}>
                                            {item.page}
                                        </Link>
                                    )}
                                </li>
                            );
                    }
                })}
            </ul>
        </nav>
    );
}
