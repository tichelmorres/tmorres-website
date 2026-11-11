import { useState, type ReactElement } from 'react';
import styles from './searchbar.module.css';

interface SearchBarProps {
    query: string;
    onSearch: (query: string) => void;
    onFocus?: () => void;
}

/*
    A search field. Search starts after pressing Enter.
*/
export default function SearchBar({ query, onSearch, onFocus }: SearchBarProps): ReactElement {
    const [value, setValue] = useState(query);

    /*
       When  the  URL changes by itself (Back/Forward pagination, a
       shared  url  to  another  search),  the  field shows the new
       search.

       (See react.dev/learn/you-might-not-need-an-effect)
    */
    const [shownQuery, setShownQuery] = useState(query);
    if (query !== shownQuery) {
        setShownQuery(query);
        setValue(query);
    }

    return (
        <form
            role="search"
            className={styles.form}
            onSubmit={(event) => {
                event.preventDefault();
                onSearch(value.trim());
            }}>
            <input
                type="search"
                name="q"
                className={styles.input}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                onFocus={onFocus}
                placeholder="Digite sua busca e pressione Enter"
                aria-label="Pesquisar neste site"
                enterKeyHint="search"
                autoComplete="off"
                spellCheck={false}
                maxLength={200}
            />
        </form>
    );
}
