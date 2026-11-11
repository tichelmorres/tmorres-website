import type { ComponentPropsWithoutRef, ReactElement } from 'react';
import Align, { isAlignment } from '@/components/align/Align';
import styles from './table.module.css';

/*
    Replaces the <table> of Markdown tables (App.tsx), and is the
    <Table> that plugins/mdx-tables.ts writes for the tables with
    multi-line cells.
*/
export default function Table(props: ComponentPropsWithoutRef<'table'>): ReactElement {
    return (
        <div className={styles.scroll} role="region" aria-label="Tabela" tabIndex={0}>
            <table {...props} />
        </div>
    );
}

type CellProps = ComponentPropsWithoutRef<'td'>;

/*
    Wrap  the  cell  with  <Align>.   A cell of a column with no
    alignment is aligned to the left.
*/
function Cell({ tag: Tag, align, style, children, ...rest }: CellProps & { tag: 'th' | 'td' }): ReactElement {
    const { textAlign, ...otherStyle } = style ?? {};
    const alignment = align ?? textAlign;
    const cellStyle = Object.keys(otherStyle).length > 0 ? otherStyle : undefined;

    return (
        <Tag {...rest} style={cellStyle}>
            {isAlignment(alignment) ? <Align to={alignment}>{children}</Align> : children}
        </Tag>
    );
}

export function Th(props: CellProps): ReactElement {
    return <Cell tag="th" {...props} />;
}

export function Td(props: CellProps): ReactElement {
    return <Cell tag="td" {...props} />;
}
