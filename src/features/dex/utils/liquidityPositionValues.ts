import BigNumber from 'bignumber.js';
import type { LiquidityPosition } from '../types/pool';

const rawInteger = (value: string | undefined) => {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  return new BigNumber(value);
};

/** Pair reserves, total supply and LP balances are base-unit integers. */
export function liquidityPositionValues(position: LiquidityPosition) {
  const balance = rawInteger(position.balance);
  const supply = rawInteger(position.pair.total_supply);
  const validShare = balance && supply && supply.gt(0) && balance.lte(supply);
  const pooled = (reserve: string, decimals: number) => {
    const raw = rawInteger(reserve);
    if (!validShare || !raw || !Number.isInteger(decimals) || decimals < 0 || decimals > 255) return undefined;
    return balance.times(raw).dividedToIntegerBy(supply).shiftedBy(-decimals).toFixed();
  };
  return {
    lpBalance: balance?.shiftedBy(-18).toFixed(),
    sharePct: validShare ? balance.div(supply).times(100).toFixed() : undefined,
    amount0: pooled(position.pair.reserve0, position.pair.token0.decimals),
    amount1: pooled(position.pair.reserve1, position.pair.token1.decimals),
  };
}
