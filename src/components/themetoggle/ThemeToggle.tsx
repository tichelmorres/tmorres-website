import { useEffect, useState, useSyncExternalStore, type ReactElement } from 'react';
import styles from './themetoggle.module.css';

type Theme = 'light' | 'dark';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/*
    LocalStorage  key  read  by the inline script of index.html.
    Holds 'light' or 'dark'.
*/
const THEME_KEY = 'theme';

// localStorage can be blocked by the browser
function readStoredTheme(): Theme | null {
    try {
        const value = localStorage.getItem(THEME_KEY);
        return value === 'light' || value === 'dark' ? value : null;
    } catch {
        return null;
    }
}

function storeTheme(theme: Theme): void {
    try {
        localStorage.setItem(THEME_KEY, theme);
    } catch {
        // the choice is just not remembered
    }
}

function subscribeToSystemTheme(onChange: () => void): () => void {
    const query = window.matchMedia(DARK_QUERY);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
}

function getSystemTheme(): Theme {
    return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

export default function ThemeToggle(): ReactElement {
    // follow the platform until the button is clicked
    const systemTheme = useSyncExternalStore(subscribeToSystemTheme, getSystemTheme);
    const [chosenTheme, setChosenTheme] = useState<Theme | null>(readStoredTheme);
    const theme = chosenTheme ?? systemTheme;

    useEffect(() => {
        if (chosenTheme !== null) {
            document.documentElement.dataset.theme = chosenTheme;
        }
    }, [chosenTheme]);

    function handleClick(): void {
        const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
        setChosenTheme(nextTheme);
        storeTheme(nextTheme);
    }

    const symbol = theme === 'dark' ? '月' : '日';

    return (
        <button
            type="button"
            className={styles.toggle}
            aria-label={theme === 'dark' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'}
            onClick={handleClick}>
            {symbol}
        </button>
    );
}
