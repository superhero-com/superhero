// Mobile-friendly compact time like 2m, 2h, 1d, 4d, 1w
export function compactTime(input: string | number | Date | undefined): string {
  if (!input) return '';
  const now = Date.now();
  const ts = new Date(input).getTime();
  const seconds = Math.max(0, Math.floor((now - ts) / 1000));
  if (seconds < 60) return `${Math.max(1, seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w`;
}

export function fullTimestamp(input: string | number | Date | undefined): string {
  if (!input) return '';
  const d = new Date(input);
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
}


