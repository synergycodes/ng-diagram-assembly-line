/** Display string for a metric that hasn't arrived / isn't applicable. */
export const NOT_AVAILABLE = 'N/A';

/** Thousands-grouped integer, or `N/A` when undefined. */
export function formatCount(value: number | undefined): string {
  return value === undefined ? NOT_AVAILABLE : value.toLocaleString('en-US');
}

/** `Xm SSs` from seconds (`Ss` under a minute), or `N/A`. */
export function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined) {
    return NOT_AVAILABLE;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) {
    return `${s}s`;
  }
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

/** `Xh MMm` (or `Mm` under an hour) from minutes, or `N/A`. */
export function formatHoursMinutes(minutes: number | undefined): string {
  if (minutes === undefined) {
    return NOT_AVAILABLE;
  }
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) {
    return `${m}m`;
  }
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/** Percentage value trimmed to one decimal (integers stay whole), or `N/A`. */
export function formatPct(value: number | undefined): string {
  if (value === undefined) {
    return NOT_AVAILABLE;
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
