import { useEffect, useRef, type CanvasHTMLAttributes, type ReactElement } from 'react';
import styles from "./vortex.module.css";

/*
    Upper  bound  of  the  simulation  rate.   A  frame  is  one
    simulation  step,  so  without a bound a 240 Hz screen would
    run the animation twice as fast as a 120 Hz one.
*/
const MAX_FPS = 120;
const MIN_FRAME_MS = 1000 / MAX_FPS;
/*
    requestAnimationFrame  timestamps  jitter by a fraction of a
    millisecond.   Without this margin a frame arriving slightly
    early would be skipped, and a 120 Hz screen would drop to 60
    fps.
*/
const FRAME_JITTER_MS = 1;

/*
    Speed  (pixels per frame) under which a particle is at rest.
    When  all the particles are at rest, nothing is simulated or
    drawn until the pointer, the color or the size changes.
*/
const REST_SPEED = 0.001;

/*
    A  spacing  x spacing cell of the text becomes a particle if
    its mean alpha (0-255) is at least this.
*/
const ALPHA_THRESHOLD = 128;

// pointer position when not on the canvas means it's too far to repel anything
const POINTER_AWAY = -9999;

/*
    All the lengths in pixels (bleed, particle size and spacing,
    repel  radius...)   are  given  for  a font of this size and
    scaled  linearly  to  the  actual  one.   The effect and the
    proportions  of  the  canvas  are  thus the same at any font
    size.
*/
const REFERENCE_FONT_SIZE = 200;

interface VortexProps
    extends Omit<CanvasHTMLAttributes<HTMLCanvasElement>, 'width' | 'height' | 'children'> {
    text           : string;
    fit?           : boolean;
    bleed?         : number;
    density?       : number;
    particleSize?  : number;
    springK?       : number;
    damping?       : number;
    repelRadius?   : number;
    repelStrength? : number;
    minDist?       : number;
}

interface TextBox {
    x: number; y: number;
    w: number; h: number;
}

// lengths in pixels, scaled to the current font size
interface Metrics {
    spacing       : number;
    size          : number;
    bleed         : number;
    repelRadius   : number;
    repelStrength : number;
    minDist       : number;
}

export default function Vortex({
    text,
    fit           = true,
    bleed         = 56,
    density       = 0.56,
    particleSize,
    springK       = 0.056,
    damping       = 0.86,
    repelRadius   = 190,
    repelStrength = 119,
    minDist       = 19,
    className,
    ...canvasProps
}: VortexProps): ReactElement {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // distance between particles at the reference font size
    const baseSpacing = Math.max(1, Math.round(2 / Math.max(density, 0.01)));

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        const scratch = document.createElement('canvas').getContext('2d');
        if (!canvas || !ctx || !scratch) return;

        const style = getComputedStyle(canvas);
        const getFont = (): string =>
            `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

        const getMetrics = (): Metrics => {
            const scale = parseFloat(style.fontSize) / REFERENCE_FONT_SIZE;
            // the size of the cells sampled from the text
            const spacing = Math.max(1, Math.round(baseSpacing * scale));
            return {
                spacing,
                size: particleSize === undefined ? spacing : particleSize * scale,
                bleed: bleed * scale,
                repelRadius: repelRadius * scale,
                /*
                   The  push  is  strength  /  distance,  so it must scale as a
                   length (pixels per frame^2).
                */
                repelStrength: repelStrength * scale * scale,
                minDist: minDist * scale,
            };
        };

        // in case the user prefers reduced-motion, ignore the pointer
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

        let raf = 0;
        let generation = 0;
        let pointerX = POINTER_AWAY;
        let pointerY = POINTER_AWAY;
        let canvasW = 0;
        let canvasH = 0;

        /*
           Pointer  events  cover mouse, pen and touch.

           If  the  browser starts to scroll during a touch, the pointer
           is  cancelled  and  the  particles go back to their place (see
           onPointerLeave  and  onScroll  below).
        */
        const onPointer = (e: PointerEvent): void => {
            if (!e.isPrimary) return;
            const rect = canvas.getBoundingClientRect();
            pointerX = e.clientX - rect.left - canvas.clientLeft - parseFloat(style.paddingLeft);
            pointerY = e.clientY - rect.top - canvas.clientTop - parseFloat(style.paddingTop);
        };
        const onPointerLeave = (e: PointerEvent): void => {
            if (!e.isPrimary) return;
            pointerX = pointerY = POINTER_AWAY;
        };
        /*
           The pointer position is stored relative to the canvas and is
           only updated by pointer events.  When the page scrolls under
           a  pointer  that  does  not move (touchpad, wheel, keys), no
           pointer  event  is  fired,  so  the stored position would be
           stale  and  the particles would stay pushed until the scroll
           ends.    A  scroll  therefore  releases  them,  as  a  touch
           cancelled  by  the  browser  does.   The  next pointer event
           (browsers  send one after the scroll ends) picks the pointer
           up again if it is still over the canvas.
        */
        const onScroll = (): void => {
            pointerX = pointerY = POINTER_AWAY;
        };
        canvas.addEventListener('pointermove', onPointer);
        canvas.addEventListener('pointerdown', onPointer);
        canvas.addEventListener('pointerleave', onPointerLeave);
        window.addEventListener('scroll', onScroll, { passive: true });

        const measure = (font: string, metrics: Metrics): TextBox => {
            scratch.font = font;
            scratch.textAlign = 'left';
            scratch.textBaseline = 'alphabetic';
            const m = scratch.measureText(text);
            const edge = metrics.bleed + Math.ceil(metrics.size / 2);
            return {
                x: edge + m.actualBoundingBoxLeft,
                y: edge + m.actualBoundingBoxAscent,
                w: Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight) + 2 * edge,
                h: Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + 2 * edge,
            };
        };

        const refit = (): void => {
            const m = measure(getFont(), getMetrics());
            const extraW = style.boxSizing === 'border-box'
                ? parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
                  + parseFloat(style.borderLeftWidth) + parseFloat(style.borderRightWidth)
                : 0;
            const extraH = style.boxSizing === 'border-box'
                ? parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
                  + parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth)
                : 0;
            canvas.style.width = `${m.w + extraW}px`;
            canvas.style.height = `${m.h + extraH}px`;
        };

        const setup = (w: number, h: number): void => {
            cancelAnimationFrame(raf);
            const gen = ++generation;
            if (!w || !h) return;

            const dpr = window.devicePixelRatio || 1;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            const font = getFont();
            const metrics = getMetrics();
            const { spacing, size } = metrics;

            let textAlign: CanvasTextAlign = 'left';
            let textBaseline: CanvasTextBaseline = 'alphabetic';
            let x: number; let y: number;
            if (fit) {
                const m = measure(font, metrics);
                x = m.x; y = m.y;
            } else {
                const rtl = style.direction === 'rtl';
                const a = style.textAlign;
                const right = a === 'right' || (a === 'end' && !rtl) || (a === 'start' && rtl);
                textAlign = a === 'center' ? 'center' : right ? 'right' : 'left';
                textBaseline = 'middle';
                x = textAlign === 'center' ? w / 2 : textAlign === 'right' ? w : 0;
                y = h / 2;
            }

            const start = (): void => {
                if (gen !== generation) return;

                const src = document.createElement('canvas');
                src.width = Math.round(w);
                src.height = Math.round(h);
                const sctx = src.getContext('2d');
                if (!sctx) return;
                sctx.font = font;
                sctx.textAlign = textAlign;
                sctx.textBaseline = textBaseline;
                sctx.fillText(text, x, y);
                const data = sctx.getImageData(0, 0, src.width, src.height).data;

                const W = src.width;
                const H = src.height;
                const homeXs: number[] = [];
                const homeYs: number[] = [];
                for (let cy = 0; cy < H; cy += spacing) {
                    const y1 = Math.min(cy + spacing, H);
                    for (let cx = 0; cx < W; cx += spacing) {
                        const x1 = Math.min(cx + spacing, W);
                        let sum = 0;
                        for (let yy = cy; yy < y1; yy++) {
                            for (let xx = cx; xx < x1; xx++) sum += data[(yy * W + xx) * 4 + 3];
                        }
                        if (sum / ((x1 - cx) * (y1 - cy)) >= ALPHA_THRESHOLD) {
                            homeXs.push(cx + spacing / 2);
                            homeYs.push(cy + spacing / 2);
                        }
                    }
                }

                const radius = metrics.repelRadius;
                const strength = metrics.repelStrength;
                const minimum = metrics.minDist;
                const count = homeXs.length;
                const homeX = Float64Array.from(homeXs);
                const homeY = Float64Array.from(homeYs);
                const curX = Float64Array.from(homeXs);
                const curY = Float64Array.from(homeYs);
                const vx = new Float64Array(count);
                const vy = new Float64Array(count);

                let nextFrameAt = 0;
                let settled = false;
                let lastColor = '';
                let lastPointerX = NaN;
                let lastPointerY = NaN;

                const frame = (now: number): void => {
                    // if it's too early for the next slot, wait for the next screen refresh
                    if (now < nextFrameAt - FRAME_JITTER_MS) {
                        raf = requestAnimationFrame(frame);
                        return;
                    }
                    nextFrameAt = Math.max(nextFrameAt + MIN_FRAME_MS, now);

                    const color = style.color;
                    const still = reduceMotion.matches;
                    const px = still ? POINTER_AWAY : pointerX;
                    const py = still ? POINTER_AWAY : pointerY;

                    // at rest, with the same pointer and color as the last drawn
                    // frame, the canvas already shows what this frame would draw
                    if (settled && color === lastColor && px === lastPointerX && py === lastPointerY) {
                        raf = requestAnimationFrame(frame);
                        return;
                    }
                    lastColor = color;
                    lastPointerX = px;
                    lastPointerY = py;

                    ctx.clearRect(0, 0, w, h);
                    ctx.fillStyle = color;

                    let moving = false;
                    for (let i = 0; i < count; i++) {
                        const springX = (homeX[i] - curX[i]) * springK;
                        const springY = (homeY[i] - curY[i]) * springK;

                        let repelX = 0;
                        let repelY = 0;
                        const dx = curX[i] - px;
                        const dy = curY[i] - py;
                        const dist = Math.sqrt(dx * dx + dy * dy);
                        if (dist < radius) {
                            const d = Math.max(dist, minimum);
                            const falloff = 1 - d / radius;
                            const forceMag = (strength * falloff * falloff) / d;
                            repelX = (dx / d) * forceMag;
                            repelY = (dy / d) * forceMag;
                        }

                        vx[i] = (vx[i] + springX + repelX) * damping;
                        vy[i] = (vy[i] + springY + repelY) * damping;
                        curX[i] += vx[i];
                        curY[i] += vy[i];

                        if (Math.abs(vx[i]) > REST_SPEED || Math.abs(vy[i]) > REST_SPEED) moving = true;

                        ctx.fillRect(
                            curX[i] - size / 2,
                            curY[i] - size / 2,
                            size,
                            size,
                        );
                    }
                    settled = !moving;
                    raf = requestAnimationFrame(frame);
                };
                raf = requestAnimationFrame(frame);
            };

            document.fonts.load(font, text).then(start, start);
        };

        const ro = new ResizeObserver(([entry]) => {
            canvasW = entry.contentRect.width;
            canvasH = entry.contentRect.height;
            setup(canvasW, canvasH);
        });

        /*
           The  canvas  resolution depends on devicePixelRatio.  It can
           change  while  the  canvas  size  does  not (window moved to
           another  screen,  browser zoom) and nothing else reports it.
           A  (resolution:  Ndppx) media query matches only the current
           ratio,  so  its  change event is the notification to rebuild
           the canvas and watch the new ratio.
        */
        let stopWatchingDpr: (() => void) | undefined;
        const watchDpr = (): void => {
            const query = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
            const onChange = (): void => {
                setup(canvasW, canvasH);
                watchDpr();
            };
            query.addEventListener('change', onChange, { once: true });
            stopWatchingDpr = (): void => query.removeEventListener('change', onChange);
        };
        watchDpr();

        let cancelled = false;
        const init = (): void => {
            if (cancelled) return;
            if (fit) refit();
            ro.observe(canvas);
        };
        document.fonts.load(getFont(), text).then(init, init);

        if (fit) window.addEventListener('resize', refit);

        return (): void => {
            cancelled = true;
            generation++;
            ro.disconnect();
            stopWatchingDpr?.();
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', refit);
            window.removeEventListener('scroll', onScroll);
            canvas.removeEventListener('pointermove', onPointer);
            canvas.removeEventListener('pointerdown', onPointer);
            canvas.removeEventListener('pointerleave', onPointerLeave);
        };
    }, [text, fit, bleed, baseSpacing, particleSize, springK, damping, repelRadius, repelStrength, minDist]);
    // ^ Ugh, this is ugly

    return (
        <canvas
            ref={canvasRef}
            role="img"
            aria-label={text}
            className={className ? `${styles.vortex} ${className}` : styles.vortex}
            {...canvasProps}
        />
    );
}
