import { describe, expect, it } from 'vitest';
import { checkRouteLiquidity, getHumanPairRatio } from '../useSwapQuote';

describe('getHumanPairRatio', () => {
  const WAE = 'ct_J3zBY8xxjsRr3QojETNw48Eb38fjvEuJKkQ6KzECvubvEcvCa';
  const RPT = 'ct_2U1usf3A8ZNUcZLkZe5rEoBTxk7eJvk9fcbRDNqmRiwXCHAYN';
  const WTT = 'ct_KeTvHnhU85vuuQMMZocaiYkPL9tkoavDRT3Jsy47LK2YqLHYb';

  it('derives forward and reverse quotes from reserves for live WAE/RPT pair', () => {
    const pair = {
      address: 'pair',
      token0: { address: WAE, decimals: 18 },
      token1: { address: RPT, decimals: 18 },
      reserve0: '682278298169522524000960',
      reserve1: '1683576905196522468586',
    };

    expect(getHumanPairRatio(pair, WAE, RPT)?.toString()).toBe('0.00246');
    expect(getHumanPairRatio(pair, RPT, WAE)?.toString()).toBe('405.255');
  });

  it('derives forward and reverse quotes from reserves for live WAE/WTT pair', () => {
    const pair = {
      address: 'pair',
      token0: { address: WAE, decimals: 18 },
      token1: { address: WTT, decimals: 18 },
      reserve0: '6017502763954069390091',
      reserve1: '1934883908480172396807183',
    };

    expect(getHumanPairRatio(pair, WAE, WTT)?.toString()).toBe('321.542');
    expect(getHumanPairRatio(pair, WTT, WAE)?.toString()).toBe('0.00311');
  });

  it('falls back to reserve ratio adjusted by decimals', () => {
    const pair = {
      address: 'pair',
      token0: { address: 'token-a', decimals: 6 },
      token1: { address: 'token-b', decimals: 18 },
      reserve0: '5000000',
      reserve1: '1000000000000000000',
    };

    expect(getHumanPairRatio(pair, 'token-a', 'token-b')?.toString()).toBe('0.2');
    expect(getHumanPairRatio(pair, 'token-b', 'token-a')?.toString()).toBe('5');
  });
});

describe('checkRouteLiquidity', () => {
  it('checks the input reserve from the first path hop instead of raw route order', () => {
    const params = {
      isExactIn: true,
      amountIn: '50',
      tokenIn: { address: 'token-a', decimals: 0, is_ae: false },
      tokenOut: { address: 'token-c', decimals: 0, is_ae: false },
    } as any;

    const route = [
      {
        address: 'pair-bc',
        token0: 'token-b',
        token1: 'token-c',
        liquidityInfo: {
          reserve0: '200',
          reserve1: '1000',
        },
      },
      {
        address: 'pair-ab',
        token0: 'token-a',
        token1: 'token-b',
        liquidityInfo: {
          reserve0: '10',
          reserve1: '200',
        },
      },
    ];

    expect(checkRouteLiquidity(params, route, ['token-a', 'token-b', 'token-c'])).toEqual({
      maxOut: '1000',
      liquidityStatus: {
        exceedsLiquidity: true,
        maxAvailable: '10',
        pairAddress: 'pair-ab',
      },
    });
  });
});
