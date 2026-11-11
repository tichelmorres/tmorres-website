import type { ReactElement } from 'react';
import styles from './menubutton.module.css';

interface MenuButtonProps {
    open: boolean;
    onToggle: () => void;
    controls: string;
}

export default function MenuButton({ open, onToggle, controls }: MenuButtonProps): ReactElement {
    return (
        <button
            type="button"
            className={open ? `${styles.button} ${styles.open}` : styles.button}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
            aria-controls={controls}
            onClick={onToggle}>
            <span className={styles.line} />
            <span className={styles.line} />
            <span className={styles.line} />
        </button>
    );
}
