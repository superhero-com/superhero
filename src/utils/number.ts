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
  const n = Number(num || 0);
  if (!Number.isFinite(n)) return '0';
  if (n === 0) return '0';
  if (n < 0.01) return '< 0.01';
  if (n < 1000) return n.toFixed(decimals);
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  return `${(n / 1_000_000_000).toFixed(1)}B`;
}


