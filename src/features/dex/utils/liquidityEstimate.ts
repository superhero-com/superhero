import BigNumber from 'bignumber.js';
import type { AddLiquidityState } from '../types/pool';

type Inputs = Pick<AddLiquidityState, 'amountA' | 'amountB' | 'decA' | 'decB'>;
type Reserves = { reserveA: bigint; reserveB: bigint; totalSupply: bigint | null };

export function liquidityEstimate(input: Inputs, pool: Reserves | null): AddLiquidityState['pairPreview'] {
  const a = new BigNumber(input.amountA || 0);
  const b = new BigNumber(input.amountB || 0);
  const valid = a.isFinite() && b.isFinite() && a.gt(0) && b.gt(0);
  const existing = pool && pool.reserveA > 0n && pool.reserveB > 0n;
  const reserveA = existing ? new BigNumber(pool.reserveA.toString()).shiftedBy(-input.decA) : a;
  const reserveB = existing ? new BigNumber(pool.reserveB.toString()).shiftedBy(-input.decB) : b;
  const preview: NonNullable<AddLiquidityState['pairPreview']> = {};
  if (reserveA.gt(0) && reserveB.gt(0)) {
    preview.ratioBinA = reserveB.div(reserveA).toFixed();
    preview.ratioAinB = reserveA.div(reserveB).toFixed();
  }
  if (existing && pool.totalSupply && valid) {
    const supply = new BigNumber(pool.totalSupply.toString());
    const mint = BigNumber.min(a.div(reserveA), b.div(reserveB))
      .times(supply).integerValue(BigNumber.ROUND_DOWN);
    preview.lpMintEstimate = mint.shiftedBy(-18).toFixed();
    preview.sharePct = mint.div(supply.plus(mint)).times(100).toFixed();
  }
  return preview;
}

export function linkedDeposit(amount: string, ratio: string | undefined, decimals: number, side: 'A' | 'B') {
  if (!amount) return '';
  const rate = new BigNumber(ratio || 0);
  if (!rate.isFinite() || !rate.gt(0)) return null;
  const value = side === 'A' ? new BigNumber(amount).div(rate) : new BigNumber(amount).times(rate);
  return value.isFinite() ? value.decimalPlaces(decimals, BigNumber.ROUND_DOWN).toFixed() : null;
}

type AeLeg = { reserveA: bigint; reserveB: bigint } | null;

/**
 * Indicative A-per-B ratio for a pair without a pool, priced through each token's
 * WAE pool (reserveA = token, reserveB = WAE). Returns undefined when a leg is missing.
 */
export function referenceRatio(legA: AeLeg, legB: AeLeg, decA: number, decB: number) {
  if (!legA || !legB || legA.reserveA <= 0n || legA.reserveB <= 0n
    || legB.reserveA <= 0n || legB.reserveB <= 0n) return undefined;
  const aePrice = (leg: NonNullable<AeLeg>, decimals: number) => {
    const ae = new BigNumber(leg.reserveB.toString()).shiftedBy(-18);
    return ae.div(new BigNumber(leg.reserveA.toString()).shiftedBy(-decimals));
  };
  const ratio = aePrice(legB, decB).div(aePrice(legA, decA));
  return ratio.isFinite() && ratio.gt(0) ? ratio.toFixed() : undefined;
}

export function formatLiquidityValue(value?: string, digits = 6) {
  const number = new BigNumber(value ?? NaN);
  return number.isFinite() ? number.precision(digits).toFormat() : '—';
}
