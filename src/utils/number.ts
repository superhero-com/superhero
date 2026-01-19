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

  // Handle very small magnitudes symmetrically for positive/negative values.
  // For |n| < 10^-decimals, show as "< threshold" or ">-threshold" instead of 0.00 / -0.00.
  const threshold = Math.pow(10, -decimals);
  const thresholdStr = threshold.toFixed(decimals);
  if (value < threshold) {
    return negative ? `>-${thresholdStr}` : `< ${thresholdStr}`;
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

// Compact formatter for K/M/B notation with configurable precision.
export function formatCompactNumber(
  num: number | string | undefined,
  decimals = 2,
  compactDecimals = 2,
) {
  const n = Number(num);
  if (!Number.isFinite(n) || n === 0) return '0';
  const negative = n < 0;
  const value = Math.abs(n);

  let formatted: string;
  if (value < 1_000) {
    formatted = value.toFixed(decimals);
  } else if (value < 1_000_000) {
    formatted = `${(value / 1_000).toFixed(compactDecimals)}K`;
  } else if (value < 1_000_000_000) {
    formatted = `${(value / 1_000_000).toFixed(compactDecimals)}M`;
  } else {
    formatted = `${(value / 1_000_000_000).toFixed(compactDecimals)}B`;
  }

  return negative ? `-${formatted}` : formatted;
}


