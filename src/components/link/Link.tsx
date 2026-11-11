import type { ComponentPropsWithoutRef, ReactElement } from 'react';
import { Link } from 'react-router';

/*
    Replaces  the <a> of Markdown links in MDX (see `components`
    in   App.tsx),   so  `[text](/postagens/some-post)`  navigates
    without reloading the page.

    `[text](#some-heading)`   and   `[text](/sobre#some-heading)`
    jump  to  a  heading  (its  id  comes  from  rehype-slug, see
    vite.config.ts).  The scrolling itself is done in App.tsx.
*/
export default function MdxLink({ href, children, ...rest }: ComponentPropsWithoutRef<'a'>): ReactElement {
    const internal = href !== undefined
        && ((href.startsWith('/') && !href.startsWith('//')) || href.startsWith('#'));
    if (href !== undefined && internal) {
        return <Link to={href} {...rest}>{children}</Link>;
    }
    return <a href={href} target="_blank" {...rest}>{children}</a>;
}
