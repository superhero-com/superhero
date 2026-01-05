import BigNumber from 'bignumber.js';

/**
 * Compare human-readable decimal strings safely (no JS float rounding).
 * Returns false if inputs are empty/invalid.
 */
export function isAmountGreaterThanBalance(amount: string, balance: string): boolean {
  if (!amount) return false;

  const a = new BigNumber(amount);
  const b = new BigNumber(balance || '0');

  if (!a.isFinite() || a.isNaN() || !b.isFinite() || b.isNaN()) return false;

  return a.gt(b);
}


