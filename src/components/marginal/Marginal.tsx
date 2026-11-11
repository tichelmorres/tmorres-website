import type { ReactElement, ReactNode } from 'react';
import styles from './marginal.module.css';

export type MarginalSide = 'left' | 'right';

interface MarginalProps {
    side: MarginalSide;
    children?: ReactNode;
}

const sideClasses: Record<MarginalSide, string> = {
    left  : styles.left,
    right : styles.right,
};

/*
    Puts  its  content  in the left or right margin of the text,
    which  flows around it, like the picture and the description
    of  a  Wikipedia article.

        <Marginal side="right">
            <Imagetic path="img/wataru.png" desc="A caption" />
        </Marginal>

    On narrow areas there is no room for a margin, so it becomes
    a centered block in the place where it was written.
*/
export default function Marginal({ side, children }: MarginalProps): ReactElement {
    if (!Object.hasOwn(sideClasses, side)) {
        return (
            <>
                <p className={styles.error}>
                    Marginal error: side has to be {'"left"'} or {'"right"'}
                </p>
                {children}
            </>
        );
    }

    return <div className={`${styles.marginal} ${sideClasses[side]}`}>{children}</div>;
}
