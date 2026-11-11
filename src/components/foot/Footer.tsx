import type { ReactElement } from 'react';
import styles from './footer.module.css';

/*
    The  year  is  read once at load.  It only goes stale if the
    page stays open across new year's eve.
*/
const YEAR: number = new Date().getFullYear();

export default function Footer(): ReactElement {
    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.content}>
                    <p className={styles.copyright}>©{YEAR} Michel Torres</p>
                    <p className={styles.rights}>Todos os direitos reservados.</p>
                </div>
            </div>
        </footer>
    );
}
