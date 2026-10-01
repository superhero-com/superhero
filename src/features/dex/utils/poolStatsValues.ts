import BigNumber from 'bignumber.js';
import type { PairDto } from '@/api/generated';

export const poolNumber = (value: unknown) => {
  if ((typeof value !== 'number' && typeof value !== 'string') || value === '') return null;
  const number = new BigNumber(value);
  return number.isFinite() ? number : null;
};

const reserveAmount = (raw: string, decimals: number) => {
  if (!/^\d+$/.test(raw) || !Number.isInteger(decimals) || decimals < 0 || decimals > 255) {
    return null;
  }
  return new BigNumber(raw).shiftedBy(-decimals);
};

export function poolBalances(pair: PairDto) {
  const reserve0 = reserveAmount(pair.reserve0, pair.token0.decimals);
  const reserve1 = reserveAmount(pair.reserve1, pair.token1.decimals);
  const hasRatio = reserve0?.gt(0) && reserve1?.gt(0);
  return {
    reserve0,
    reserve1,
    // DEX pair contracts issue LP tokens with 18 decimals, independently of the assets.
    supply: reserveAmount(pair.total_supply, 18),
    rate0: hasRatio ? reserve1.div(reserve0) : null,
    rate1: hasRatio ? reserve0.div(reserve1) : null,
  };
}

export function formatPoolAmount(value: BigNumber | null) {
  if (!value) return '—';
  // Keep small nonzero amounts distinguishable from an empty balance.
  if (!value.isZero() && value.abs().lt(0.01)) return value.toPrecision(3);
  return value.toFormat(2);
}
