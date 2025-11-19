import BigNumber from 'bignumber.js';

export function shiftDecimalPlaces(amount: string | number, decimals: number) {
  return new BigNumber(amount || 0).shiftedBy(decimals);
}

export function formatTokenAmount(
  amount: string | number,
  decimals: number = 18,
  round: number = 2,
) {
  return shiftDecimalPlaces(amount, -decimals).toFixed(round);
}

// Generic formatter used across the app (cards, leaderboards, etc.)
export function formatNumber(num: number | string | undefined, decimals = 2) {
  const n = Number(num);
  if (!Number.isFinite(n) || n === 0) return '0';

  const negative = n < 0;
  const value = Math.abs(n);

  let formatted: string;

  // Preserve "< 0.01" only for very small positive values.
  if (value < 0.01 && !negative) {
    return '< 0.01';
  }

  if (value < 1000) {
    formatted = value.toFixed(decimals);
  } else if (value < 1_000_000) {
    formatted = `${(value / 1_000).toFixed(1)}K`;
  } else if (value < 1_000_000_000) {
    formatted = `${(value / 1_000_000).toFixed(1)}M`;
  } else {
    formatted = `${(value / 1_000_000_000).toFixed(1)}B`;
  }

  return negative ? `-${formatted}` : formatted;
}


