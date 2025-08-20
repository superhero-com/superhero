import { describe, it, expect } from 'vitest';
import {
  getPath,
  getRouteReserves,
  ratioFromRoute,
  ratioWithDecimals,
  getReceivedTokensForPairReserves,
  getPriceImpactForRoute,
} from '../../libs/swapUtils';

describe('swapUtils ported tests', () => {
  const A = 'a';
  const B = 'b';
  const C = 'c';
  const toPair = ([[token0, reserve0], [token1, reserve1]]: any) => ({ token0, token1, liquidityInfo: { reserve0, reserve1 } });

  it('getPath from empty route', () => {
    expect(getPath([], 'ct_1')).toEqual([]);
  });
  it('getPath builds forward path', () => {
    expect(getPath([{ token0: A, token1: B }], A)).toEqual([A, B]);
    expect(getPath([{ token0: B, token1: A }], A)).toEqual([A, B]);
    expect(getPath([{ token0: A, token1: B }, { token0: B, token1: C }], A)).toEqual([A, B, C]);
  });

  it('getRouteReserves basic cases', () => {
    const pairs = [[['a', 1], ['b', 2]]].map(toPair);
    expect(getRouteReserves(pairs as any, 'a')).toEqual([[1, 2]]);
    expect(getRouteReserves(pairs as any, 'b')).toEqual([[2, 1]]);
  });

  it('ratioFromRoute simple and two-pair', () => {
    expect(ratioFromRoute([{ token0: 'ct_1', liquidityInfo: { reserve0: 1n, reserve1: 1n } } as any], 'ct_1').toString()).toBe('1');
    expect(ratioFromRoute([
      { token0: 'ct_1', token1: 'ct_2', liquidityInfo: { reserve0: 1n, reserve1: 2n } },
      { token0: 'ct_2', token1: 'ct_3', liquidityInfo: { reserve0: 4n, reserve1: 8n } },
    ] as any, 'ct_1').toString()).toBe('4');
  });

  it('ratioWithDecimals adjusts as expected', () => {
    const r = ratioFromRoute([{ token0: 'ct_1', liquidityInfo: { reserve0: 10n, reserve1: 4000n } } as any], 'ct_1');
    expect(ratioWithDecimals(r, { decimalsA: 1, decimalsB: 3 }).toString()).toBe('4');
  });

  it('getReceivedTokensForPairReserves for chain of pairs', () => {
    expect(getReceivedTokensForPairReserves([[2, 2] as any], 2).toNumber()).toBe(1);
    expect(getReceivedTokensForPairReserves([[2, 2] as any, [2, 2] as any], 2).toNumber()).toBeCloseTo(0.6666666666666666);
  });

  it('getPriceImpactForRoute matches known cases', () => {
    const pairs = [[['a', 2000000n], ['b', 1000n]]].map(toPair);
    expect(getPriceImpactForRoute(pairs as any, 'a', 10000n)).toBeCloseTo(-0.4975124378109453);
  });
});


