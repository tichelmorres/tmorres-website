import type { ReactElement } from "react";
import { NavLink } from "react-router";
import { pages, pagePath } from "@/lib/pages";
import { ENTRIES_PATH } from "@/lib/posts";
import styles from "./sidebar.module.css";

export default function Sidebar(): ReactElement {
    return (
        <nav aria-label="Páginas">
            {pages.map(({ slug, title }) => (
                <p key={slug}>
                    <NavLink
                        to={pagePath(slug)}
                        end
                        className={({ isActive }) =>
                            isActive ? `${styles.link} ${styles.active}` : styles.link
                        }>
                        {title}
                    </NavLink>
                </p>
            ))}
            <p>
                <NavLink
                    to={ENTRIES_PATH}
                    className={({ isActive }) =>
                        isActive ? `${styles.link} ${styles.active}` : styles.link
                    }>
                    Postagens
                </NavLink>
            </p>
        </nav>
    );
}
