// Mobile-friendly compact time like 2m, 2h, 1d, 4d. Older posts show their date
// instead (e.g. "Oct 7", or "Oct 7, 2025" for an earlier year), since "37w" is
// hard to place in time.
export function compactTime(
  input: string | number | Date | undefined,
  locale?: string,
  now: number = Date.now(),
): string {
  if (!input) return '';
  const date = new Date(input);
  const ts = date.getTime();
  if (Number.isNaN(ts)) return '';
  const seconds = Math.max(0, Math.floor((now - ts) / 1000));
  if (seconds < 60) return `${Math.max(1, seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
}

// Exact local date and time, e.g. "2025-10-15 04:46:55".
export function fullTimestamp(input: string | number | Date | undefined): string {
  if (!input) return '';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
