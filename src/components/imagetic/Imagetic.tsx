import type { ReactElement } from 'react';
import Player from '@/components/player/Player';
import { useRescale } from '@/components/rescale/rescale';
import styles from './imagetic.module.css';

/*
    All  the images, GIFs and videos of src/assets/{img,gif,vid}
    as URLs. The glob is relative to this file.
*/
const urls = import.meta.glob<string>('../../assets/{img,gif,vid}/**/*.{png,jpg,jpeg,gif,webp,avif,svg,mp4,m4v,webm,ogv,mov}', {
    eager: true,
    query: '?url',
    import: 'default',
});

interface Media {
    url: string;
    ref: string;
}

/*
    Files are found by their path from src/assets

        '../../assets/img/photos/a.png' -> 'img/photos/a.png'
        '../../assets/gif/b.gif'        -> 'gif/b.gif'
        '../../assets/vid/c.mp4'        -> 'vid/c.mp4'
*/
const mediaByPath = new Map<string, Media>(
    Object.entries(urls).map(([key, url]) => {
        const relativePath = key.replace(/^.*?\/assets\//, '');
        return [relativePath, { url, ref: `assets/${relativePath}` }];
    }),
);

const VIDEO_PATH = /\.(?:mp4|m4v|webm|ogv|mov)$/i;

// if desc="ref", the description is the path of the media from src/, e.g.
// 'assets/img/wataru.png'
const REF_KEYWORD = 'ref';

interface ImageticProps {
    path: string;
    alt?: string;
    desc?: string;
    // videos only
    autoPlay?: boolean;
    loop?: boolean;
    muted?: boolean;
}

/*
    Inside a <Rescale> (see Rescale.tsx) the media has the width
    and  the  height  that  it asks for, and not the ones of the
    file.
*/
export default function Imagetic({ path, alt = '', desc, autoPlay, loop, muted }: ImageticProps): ReactElement {
    const rescale = useRescale();
    const ratio = rescale === null ? undefined : rescale.width / rescale.height;

    // both './img/a.png' and '/img/a.png' mean 'img/a.png'
    const relativePath = path.replace(/^(\.?\/)+/, '');
    const media = mediaByPath.get(relativePath);

    if (media === undefined) {
        return (
            <p>
                Mídia não encontrada em <code>src/assets</code>: <code>{path}</code>
            </p>
        );
    }

    const description = desc === REF_KEYWORD ? media.ref : desc;

    return (
        <figure
            className={rescale === null ? styles.figure : `${styles.figure} ${styles.rescaled}`}
            style={rescale === null ? undefined : { width: rescale.width }}>
            {VIDEO_PATH.test(relativePath) ? (
                <Player src={media.url} label={alt} autoPlay={autoPlay} loop={loop} muted={muted} ratio={ratio} />
            ) : (
                <img
                    className={ratio === undefined ? styles.image : `${styles.image} ${styles.rescaledImage}`}
                    style={ratio === undefined ? undefined : { aspectRatio: ratio }}
                    src={media.url}
                    alt={alt}
                />
            )}
            {description ? <figcaption className={styles.description}>{description}</figcaption> : null}
        </figure>
    );
}
