/*
    Seconds as the clock of a player.

        75   -> '1:15'
        3725 -> '1:02:05'

    What is not a time yet (NaN before the metadata arrives, the
    Infinity of a live stream, negatives) is shown as '0:00'.
*/
export function formatTime(seconds: number): string {
    const total   = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
    const hours   = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const rest    = total % 60;

    const pad = (value: number): string => String(value).padStart(2, '0');
    return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
}
