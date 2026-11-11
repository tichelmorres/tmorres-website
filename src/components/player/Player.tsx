import { useEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { formatTime } from './player';
import styles from './player.module.css';

interface PlayerProps {
    src       : string;
    label?    : string;
    autoPlay? : boolean;
    loop?     : boolean;
    muted?    : boolean;
    // width / height of the frame, when <Rescale> asked for a size (see Imagetic)
    ratio?    : number;
}

// the volume the sound comes back with when it is turned on from silence
// range: [0, 1]
const DEFAULT_VOLUME = 1;

/*
    While  the slider moves, the video rests after each seek for
    SEEK_REST  times  as  long  as the seek took, and never less
    than  MIN_SEEK_GAP  ms.  So it spends at most a third of the
    time seeking, i.e.  a video that is cheap to seek shows many
    frames,  and  a  heavy  one shows few, instead of taking the
    whole CPU.
*/
const SEEK_REST = 2;
const MIN_SEEK_GAP = 100;

function Icon({ children }: { children: ReactNode }): ReactElement {
    return (
        <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            {children}
        </svg>
    );
}

// "󰐊"
function PlayIcon(): ReactElement {
    return (
        <Icon>
            <path d="M4 2l10 6-10 6z" />
        </Icon>
    );
}

// "󰏤"
function PauseIcon(): ReactElement {
    return (
        <Icon>
            <path d="M3 2h4v12H3zM9 2h4v12H9z" />
        </Icon>
    );
}

// "", "", ""
function VolumeIcon({ level }: { level: 'off' | 'low' | 'high' }): ReactElement {
    return (
        <Icon>
            <path d="M1 6h3l4-3.5v11L4 10H1z" />
            <g fill="none" stroke="currentColor" strokeWidth="1.5">
                {level === 'off'  ? <path d="M10.5 5.5l5 5M15.5 5.5l-5 5" /> : null}
                {level !== 'off'  ? <path d="M10.5 5.5a3.5 3.5 0 0 1 0 5" /> : null}
                {level === 'high' ? <path d="M12.5 3.5a6.5 6.5 0 0 1 0 9" /> : null}
            </g>
        </Icon>
    );
}

/*
    A video with controls (see Imagetic).

        <Player src="/clip.mp4" label="What the clip shows" />

    The  <video> is the one that knows if it plays, what time it
    is  and  how  loud  it is.  The state of this component only
    mirrors it (see `readState`).

    With  a  `ratio`, the frame of the video is stretched to it
    and  is  as  wide  as the player, whatever the size of the
    file.   The  controls  keep  their size below the frame, and
    wrap to more lines if there is not enough width for them.
*/
export default function Player({ src, label, autoPlay = false, loop = false, muted = false, ratio }: PlayerProps): ReactElement {
    // browsers only let a video start by itself without sound
    const startMuted = muted || autoPlay;

    const videoRef = useRef<HTMLVideoElement>(null);
    // where the slider wants the video to be, when it has not been sent there yet (see `seek`)
    const pendingSeek   = useRef<number | null>(null);
    const seekStartedAt = useRef<number | null>(null);
    const seekEndedAt   = useRef(0);
    // how long the last seek took
    const seekCost  = useRef(0);
    const seekTimer = useRef<number | undefined>(undefined);
    // if the pointer was released, cancel rest
    const urgentSeek = useRef(false);
    // the last place the slider asked for
    const sliderTime = useRef(0);
    // the video went to a keyframe near the slider with `fastSeek`, and not to the exact place
    const roughSeek = useRef(false);
    // true while the slider is dragged
    const scrubbing = useRef(false);
    // the video was playing when the drag began, and is only paused until it ends
    const resumeAfterScrub               = useRef(false);
    const [playing     , setPlaying]     = useState(false);
    const [currentTime , setCurrentTime] = useState(0);
    const [duration    , setDuration]    = useState(0);
    const [volume      , setVolume]      = useState(1);
    const [isMuted     , setIsMuted]     = useState(startMuted);

    // copies what the video says about itself into the state
    function readState(video: HTMLVideoElement): void {
        // when paused by the drag, the play button should still display "playing"
        setPlaying(!video.paused || resumeAfterScrub.current);
        // the video is left behind on purpose
        if (!scrubbing.current && pendingSeek.current === null) setCurrentTime(video.currentTime);
        // NaN before the metadata and Infinity for a live stream
        setDuration(Number.isFinite(video.duration) ? video.duration : 0);
        setVolume(video.volume);
        setIsMuted(video.muted);
    }

    /*
       The video starts to load when it is created.
    */
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const sync = (): void => readState(video);
        sync();

        // when the seek is over, goes on to the last place the slider asked for
        const onSeeked = (): void => {
            if (seekStartedAt.current !== null) {
                seekEndedAt.current = performance.now();
                seekCost.current = seekEndedAt.current - seekStartedAt.current;
                seekStartedAt.current = null;
            }
            flushSeek();
            sync();
        };

        const events = ['play', 'pause', 'durationchange', 'timeupdate', 'volumechange'] as const;
        for (const event of events) video.addEventListener(event, sync);
        video.addEventListener('seeked', onSeeked);
        return (): void => {
            for (const event of events) video.removeEventListener(event, sync);
            video.removeEventListener('seeked', onSeeked);
            window.clearTimeout(seekTimer.current);
        };
    }, []);

    /*
       `timeupdate`  fires only a few times per second, which makes
       the  progress  bar jump.  While the video plays, the time is
       read on every frame instead.
    */
    useEffect(() => {
        if (!playing) return;

        let frame = requestAnimationFrame(function tick(): void {
            const video = videoRef.current;
            if (video && !scrubbing.current && pendingSeek.current === null) setCurrentTime(video.currentTime);
            frame = requestAnimationFrame(tick);
        });
        return (): void => cancelAnimationFrame(frame);
    }, [playing]);

    function togglePlaying(): void {
        const video = videoRef.current;
        if (!video) return;

        if (video.paused) {
            // The promise rejects when the play is blocked or interrupted. The
            // state follows the play and pause events, so there is nothing to undo.
            video.play().catch(() => {});
        } else {
            video.pause();
        }
    }

    /*
       A  slider  fires many events per second, and each assignment
       of  `currentTime`  starts a seek that cancels the one before
       it.   The  browser  then  decodes  from a keyframe again and
       again,  and due to the high frequency of event reports, none
       of  them  finish.   So  the  slider only leaves its place in
       `pendingSeek`, and `flushSeek` sends the video there when it
       is free and has rested enough (see SEEK_REST).  Frames still
       show up while dragging.
    */
    function flushSeek(force = false): void {
        const video = videoRef.current;
        const next = pendingSeek.current;
        if (!video) return;
        if (next === null) {
            urgentSeek.current = false;
            return;
        }
        if (video.seeking) {
            urgentSeek.current ||= force;
            return;
        }

        const rest = Math.max(MIN_SEEK_GAP, seekCost.current * SEEK_REST);
        const wait = seekEndedAt.current + rest - performance.now();
        if (wait > 0 && !force && !urgentSeek.current) {
            seekTimer.current ??= window.setTimeout(() => {
                seekTimer.current = undefined;
                flushSeek();
            }, wait);
            return;
        }

        // the pointer is still down: a place near the slider is enough
        const rough = scrubbing.current && !force && !urgentSeek.current;
        urgentSeek.current = false;
        pendingSeek.current = null;
        seekStartedAt.current = performance.now();

        /*
           fastSeek()  goes to the nearest keyframe and not to the
           exact time, so it decodes far less.  It is not available in
           Chrome  (nor  Edge or Opera), only in Firefox and Safari;
           there, `currentTime` does the exact seek.
        */
        if (rough && typeof video.fastSeek === 'function') {
            roughSeek.current = true;
            video.fastSeek(next);
        } else {
            roughSeek.current = false;
            video.currentTime = next;
        }
    }

    function seek(time: number): void {
        sliderTime.current = time;
        pendingSeek.current = time;
        flushSeek();
        setCurrentTime(time);
    }

    /*
       While  the  progress slider is dragged a playing video is
       paused:  it  would  decode  and play frames that the next
       seek throws away.  It goes on when the pointer is released,
       wherever that happens.
    */
    function startScrub(): void {
        const video = videoRef.current;
        if (!video || scrubbing.current) return;

        scrubbing.current = true;
        if (!video.paused) {
            resumeAfterScrub.current = true;
            video.pause();
        }

        const release = new AbortController();
        const end = (): void => {
            release.abort();
            scrubbing.current = false;
            // fastSeek() leaves the video on a keyframe, so the slider's place is asked again
            if (roughSeek.current) pendingSeek.current = sliderTime.current;
            // the exact place, now
            flushSeek(true);
            // the component can be gone by now
            if (video.isConnected && resumeAfterScrub.current) video.play().catch(() => {});
            resumeAfterScrub.current = false;
            readState(video);
        };
        window.addEventListener('pointerup', end, { signal: release.signal });
        window.addEventListener('pointercancel', end, { signal: release.signal });
    }

    /*
       The  two  below  read the state back right after they change
       the video.
    */
    function changeVolume(next: number): void {
        const video = videoRef.current;
        if (!video) return;

        video.muted = false;
        video.volume = next;
        readState(video);
    }

    function toggleMuted(): void {
        const video = videoRef.current;
        if (!video) return;

        if (video.muted || video.volume === 0) {
            video.muted = false;
            if (video.volume === 0) video.volume = DEFAULT_VOLUME;
        } else {
            video.muted = true;
        }
        readState(video);
    }

    const silent = isMuted || volume === 0;
    const shownVolume = silent ? 0 : volume;
    const level = silent ? 'off' : volume < 0.5 ? 'low' : 'high';
    const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;

    return (
        <div className={ratio === undefined ? styles.player : `${styles.player} ${styles.rescaled}`}>
            <video
                ref={videoRef}
                className={ratio === undefined ? styles.video : `${styles.video} ${styles.rescaledVideo}`}
                style={ratio === undefined ? undefined : { aspectRatio: ratio }}
                src={src}
                aria-label={label || undefined}
                preload="metadata"
                playsInline
                autoPlay={autoPlay}
                loop={loop}
                muted={startMuted}
                onClick={togglePlaying}>
                Seu navegador não reproduz este vídeo.
            </video>
            <div className={styles.controls} role="group" aria-label="Controles do vídeo">
                <input
                    type="range"
                    className={`${styles.range} ${styles.progress}`}
                    style={{ '--ratio': progress } as CSSProperties}
                    min={0}
                    max={duration}
                    step="any"
                    value={Math.min(currentTime, duration)}
                    disabled={duration <= 0}
                    aria-label="Progresso do vídeo"
                    onPointerDown={startScrub}
                    aria-valuetext={`${formatTime(currentTime)} de ${formatTime(duration)}`}
                    onChange={(event) => seek(event.target.valueAsNumber)}
                />
                <div className={styles.row}>
                    <button
                        type="button"
                        className={styles.button}
                        aria-label={playing ? 'Pausar vídeo' : 'Reproduzir vídeo'}
                        onClick={togglePlaying}>
                        {playing ? <PauseIcon /> : <PlayIcon />}
                    </button>
                    <div className={styles.sound}>
                        <button
                            type="button"
                            className={styles.button}
                            aria-label={silent ? 'Ativar o som' : 'Silenciar'}
                            onClick={toggleMuted}>
                            <VolumeIcon level={level} />
                        </button>
                        <input
                            type="range"
                            className={`${styles.range} ${styles.volume}`}
                            style={{ '--ratio': shownVolume } as CSSProperties}
                            min={0}
                            max={1}
                            step={0.05}
                            value={shownVolume}
                            aria-label="Volume"
                            aria-valuetext={`${Math.round(shownVolume * 100)}%`}
                            onChange={(event) => changeVolume(event.target.valueAsNumber)}
                        />
                    </div>
                    <span className={styles.time} aria-hidden="true">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                </div>
            </div>
        </div>
    );
}
