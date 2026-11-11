import type { ReactElement, ReactNode } from 'react';
import { RescaleContext, parsePixels } from './rescale';
import styles from './rescale.module.css';

interface RescaleProps {
    width: number | string;
    height: number | string;
    children?: ReactNode;
}

/*
    Gives  an exact width and height, in pixels, to a <Imagetic>
    component inside of it.

        <Rescale width={320} height={180}>
            <Imagetic path="vid/harmonograph.mp4" />
        </Rescale>

    The file is stretched to fit the size, whether the result is
    smaller  or  bigger  than the file.  If the area is narrower
    than  `width`,  everything  shrinks  together  and keeps the
    proportion of `width` and `height`.
*/
export default function Rescale({ width, height, children }: RescaleProps): ReactElement {
    const pixelsWide = parsePixels(width);
    const pixelsHigh = parsePixels(height);

    if (pixelsWide === null || pixelsHigh === null) {
        return (
            <>
                <p className={styles.error}>
                    Rescale error: width and height have to be positive numbers (in pixels)
                </p>
                {children}
            </>
        );
    }

    return <RescaleContext value={{ width: pixelsWide, height: pixelsHigh }}>{children}</RescaleContext>;
}
