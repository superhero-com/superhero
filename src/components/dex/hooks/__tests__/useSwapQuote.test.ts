import { describe, expect, it } from 'vitest';
import { checkRouteLiquidity } from '../useSwapQuote';

describe('checkRouteLiquidity', () => {
  it('derives max output from reserve ratios for the first path hop', () => {
    const params = {
      isExactIn: true,
      amountIn: '60',
      tokenIn: { address: 'token-a', decimals: 6, is_ae: false },
      tokenOut: { address: 'token-b', decimals: 18, is_ae: false },
    } as any;

    const route = [
      {
        address: 'pair-ab',
        token0: 'token-a',
        token1: 'token-b',
        liquidityInfo: {
          reserve0: '5000000',
          reserve1: '1000000000000000000',
        },
      },
    ];

    expect(checkRouteLiquidity(params, route, ['token-a', 'token-b'])).toEqual({
      maxOut: '1',
      liquidityStatus: {
        exceedsLiquidity: true,
        maxAvailable: '5',
        pairAddress: 'pair-ab',
      },
    });
  });

  it('uses the reverse reserve ratio when the swap direction is reversed', () => {
    const params = {
      isExactIn: true,
      amountIn: '2',
      tokenIn: { address: 'token-b', decimals: 18, is_ae: false },
      tokenOut: { address: 'token-a', decimals: 6, is_ae: false },
    } as any;

    const route = [
      {
        address: 'pair-ab',
        token0: 'token-a',
        token1: 'token-b',
        liquidityInfo: {
          reserve0: '5000000',
          reserve1: '1000000000000000000',
        },
      },
    ];

    expect(checkRouteLiquidity(params, route, ['token-b', 'token-a'])).toEqual({
      maxOut: '5',
      liquidityStatus: {
        exceedsLiquidity: true,
        maxAvailable: '1',
        pairAddress: 'pair-ab',
      },
    });
  });

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
