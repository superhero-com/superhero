export const HIGH_SLIPPAGE_PCT = 5;
export const LOW_SLIPPAGE_PCT = 0.1;

export type SlippageLevel = 'high' | 'low' | null;

/** Classify a slippage tolerance so the UI can warn about risky values. */
export function slippageLevel(value: number | string): SlippageLevel {
  const pct = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isFinite(pct) || String(value).trim() === '') return null;
  if (pct > HIGH_SLIPPAGE_PCT) return 'high';
  if (pct < LOW_SLIPPAGE_PCT) return 'low';
  return null;
}
