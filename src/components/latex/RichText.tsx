import { Fragment, type ReactElement, type ReactNode } from 'react';
import { typographicDashes } from '@/lib/dashes';
import LaTeX from './LaTeX';

/*
    "Compile"  the text from the metadata of a post (head, desc,
    date),  which  never  goes  through  MDX.   It gets the same
    treatment as the page:

        $x^2$        ->  inline equation
        $$x^2$$      ->  inline equation
        \$           ->  a real dollar sign
        ---  --      ->  em dash, en dash
*/

// $$...$$, then $...$
const MATH = /(?<!\\)\$\$([^]+?)\$\$|(?<!\\)\$((?:[^$\\\n]|\\[^])+?)\$/g;

interface RichTextProps {
    text: string;
    renderText?: (text: string) => ReactNode;
}

const plain = (text: string): string => typographicDashes(text).replace(/\\\$/g, '$');

export default function RichText({ text, renderText = (piece) => piece }: RichTextProps): ReactElement {
    const parts: ReactNode[] = [];
    let at = 0;

    for (const match of text.matchAll(MATH)) {
        const tex = match[1] ?? match[2];
        // `$ $` is not an equation
        if (tex.trim() === '') continue;

        if (match.index > at) {
            parts.push(<Fragment key={`t${at}`}>{renderText(plain(text.slice(at, match.index)))}</Fragment>);
        }
        parts.push(<LaTeX key={`m${match.index}`}>{tex}</LaTeX>);
        at = match.index + match[0].length;
    }

    if (at < text.length) {
        parts.push(<Fragment key={`t${at}`}>{renderText(plain(text.slice(at)))}</Fragment>);
    }
    return <>{parts}</>;
}
