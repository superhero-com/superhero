export function relativeTime(input: string | number | Date | undefined): string {
  if (!input) return '';
  const now = new Date().getTime();
  const ts = new Date(input).getTime();
  const diff = Math.floor((ts - now) / 1000);
  const abs = Math.abs(diff);
  const units: Array<[number, Intl.RelativeTimeFormatUnit]> = [
    [60, 'second'],
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.34524, 'week'],
    [12, 'month'],
    [Number.POSITIVE_INFINITY, 'year'],
  ];
  let unit: Intl.RelativeTimeFormatUnit = 'second';
  let value = abs;
  let i = 0;
  while (i < units.length - 1 && value >= units[i][0]) {
    value = Math.floor(value / units[i][0]);
    unit = units[i + 1][1];
    i += 1;
  }
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  return rtf.format(diff < 0 ? -value : value, unit);
}


