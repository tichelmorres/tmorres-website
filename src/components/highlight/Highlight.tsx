import {
    Children,
    cloneElement,
    isValidElement,
    type CSSProperties,
    type ReactElement,
    type ReactNode,
} from 'react';
import styles from './highlight.module.css';

export type HighlightEffect = 'wobbly' | 'marked' | 'negated';

interface HighlightProps {
    children ?: ReactNode;
    affect   ?: HighlightEffect;
    onHover  ?: HighlightEffect;
    tint     ?: boolean;
}

const hoverClasses: Record<HighlightEffect, string> = {
    wobbly  : styles.hoverWobbly,
    marked  : styles.hoverMarked,
    negated : styles.hoverNegated,
};

const affectClasses: Record<HighlightEffect, string> = {
    wobbly  : styles.affectWobbly,
    marked  : styles.affectMarked,
    negated : styles.affectNegated,
};

// --- wobbly --------------------------------------------------

/*
    Whitespace   |   one   Japanese  character  |  some  run  of
    characters.   Japanese has no spaces, so each character is a
    unit  and  a  line may break between any two of them.  Other
    runs are never broken.
*/
const TOKENS =
    /\s+|[\p{scx=Han}\p{scx=Hiragana}\p{scx=Katakana}]|[^\s\p{scx=Han}\p{scx=Hiragana}\p{scx=Katakana}]+/gu;

interface Counter {
    next: number;
}

function splitText(text: string, counter: Counter): ReactNode[] {
    const nodes: ReactNode[] = [];

    for (const token of text.match(TOKENS) ?? []) {
        if (/^\s+$/.test(token)) {
            // spaces wobble too, so they must be letters (see `.space`)
            const index = counter.next++;
            nodes.push(
                <span key={`space-${index}`} className={`${styles.letter} ${styles.space}`} style={{ '--i': index } as CSSProperties}>
                    {' '}
                </span>,
            );
            continue;
        }

        const letters = Array.from(token).map((letter) => {
            const index = counter.next++;
            return (
                <span key={index} className={styles.letter} style={{ '--i': index } as CSSProperties}>
                    {letter}
                </span>
            );
        });

        nodes.push(
            <span key={`word-${nodes.length}`} className={styles.word}>
                {letters}
            </span>,
        );
    }

    return nodes;
}

// split all the text of children into letters, including the text of nested elements
// (e.g. the <strong> that **bold** gives in MDX)
function splitChildren(children: ReactNode, counter: Counter): ReactNode {
    return Children.map(children, (child) => {
        if (typeof child === 'string' || typeof child === 'number') {
            return splitText(String(child), counter);
        }
        if (isValidElement<{ children?: ReactNode }>(child) && child.props.children !== undefined) {
            return cloneElement(child, undefined, splitChildren(child.props.children, counter));
        }
        return child;
    });
}

function wobble(children: ReactNode): { content: ReactNode; total: number } {
    const counter: Counter = { next: 0 };
    const content = splitChildren(children, counter);
    return { content, total: counter.next };
}

// -------------------------------------------------------------

// unknown values are ignored
function known(value: HighlightEffect | undefined): HighlightEffect | undefined {
    return value && Object.hasOwn(hoverClasses, value) ? value : undefined;
}

export default function Highlight({ children, affect, onHover, tint = false }: HighlightProps): ReactElement {
    const affectEffect = known(affect);
    // if the same effect is used twice, affect wins
    const hover = known(onHover);
    const hoverEffect = hover === affectEffect ? undefined : hover;

    const className = [
        tint         && styles.highlightColor,
        affectEffect && affectClasses[affectEffect],
        hoverEffect  && hoverClasses[hoverEffect],
    ].filter(Boolean)
     .join(' ');

    if (affectEffect === 'wobbly' || hoverEffect === 'wobbly') {
        const { content, total } = wobble(children);
        return (
            <span className={className} style={{ '--n': total } as CSSProperties}>
                {content}
            </span>
        );
    }

    return <span className={className}>{children}</span>;
}
