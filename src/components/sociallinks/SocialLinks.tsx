import type { CSSProperties, ReactElement } from 'react';
import styles from './sociallinks.module.css';

interface SocialLink {
    label : string;
    icon  : string;
    href  : string;
    size? : string;
}

// The  icons  of  the sidebar in order
const LINKS: readonly SocialLink[] = [
    { label: 'GitHub',      icon: 'github-icon',   href: 'https://github.com/tichelmorres'                                             },
    { label: 'E-Mail',      icon: 'email-icon',    href: 'mailto:qualquercoisahhhh@gmail.com'                                          },
    { label: 'LinkedIn',    icon: 'linkedin-icon', href: 'https://www.linkedin.com/in/michel-torres-soares-bb5358435/', size: '1.4rem' },
    { label: 'Mastodon',    icon: 'mastodon-icon', href: 'https://mastodon.social/@tichelmorres/'                                      },
    { label: 'Reddit',      icon: 'reddit-icon',   href: 'https://www.reddit.com/user/tmorres/'                                        },
];

const SPRITE = `${import.meta.env.BASE_URL}icons.svg`;

export default function SocialLinks(): ReactElement {
    return (
        <nav aria-label="Redes sociais" className={styles.dock}>
            <ul className={styles.list} data-fit="social">
                {LINKS.map(({ label, icon, href, size }) => (
                    <li key={icon}>
                        <a
                            className={styles.link}
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={label}
                            title={label}>
                            <svg
                                className={styles.icon}
                                style={size === undefined ? undefined : ({ '--size': size } as CSSProperties)}
                                aria-hidden="true"
                                focusable="false">
                                <use href={`${SPRITE}#${icon}`} />
                            </svg>
                        </a>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
