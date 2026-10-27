import { describe, expect, it } from 'vitest';
import type { DexTokenDto, PairDto } from '@/api/generated';
import { CONFIG } from '@/config';
import { alignPairWithChain, poolBalances, poolValueAe } from '../poolStatsValues';

const token = (address: string, symbol: string, decimals: number) => ({
  address, symbol, name: symbol, decimals, pairs_count: 1, created_at: '', is_ae: false, listed: true,
}) as DexTokenDto;
const wae = token(CONFIG.DEX_WAE, 'WAE', 18);
const rpt = token('ct_rpt', 'RPT', 18);
// Indexed pair lists WAE first and carries stale reserves.
const indexed: PairDto = {
  address: 'ct_pool',
  token0: wae,
  token1: rpt,
  reserve0: '682278298169522524000960',
  reserve1: '1683576905196522468586',
  total_supply: '1',
  transactions_count: 1,
  created_at: '',
};
// The pair contract has RPT as token0.
const chain = {
  token0: 'ct_rpt',
  token1: CONFIG.DEX_WAE,
  reserve0: 651429078341558327854687n,
  reserve1: 5170855094038597954340n,
  totalSupply: 52674469943465746004845n,
};

describe('pool values from the pair contract', () => {
  it('maps on-chain reserves to tokens by address when the indexer order is reversed', () => {
    const aligned = alignPairWithChain(indexed, chain)!;
    expect(aligned.swapped).toBe(true);
    expect(aligned.pair.reserve0).toBe(chain.reserve1.toString());
    expect(aligned.pair.reserve1).toBe(chain.reserve0.toString());
    expect(aligned.pair.total_supply).toBe(chain.totalSupply.toString());
    const { rate0, rate1 } = poolBalances(aligned.pair);
    // 1 WAE buys ~126 RPT and 1 RPT is worth ~0.0079 AE: both directions agree.
    expect(rate0!.toFixed(2)).toBe('125.98');
    expect(rate1!.toFixed(6)).toBe('0.007938');
    expect(rate0!.times(rate1!).toFixed(12)).toBe('1.000000000000');
    expect(poolValueAe(aligned.pair)!.toFixed(2)).toBe('10341.71');
  });

  it('keeps the order when it already matches and respects each token decimals', () => {
    const usd = token('ct_usd', 'USD', 6);
    const pair = {
      ...indexed, token0: usd, token1: wae, reserve0: '0', reserve1: '0',
    };
    const aligned = alignPairWithChain(pair, {
      token0: 'ct_usd', token1: CONFIG.DEX_WAE, reserve0: 200n * 10n ** 6n, reserve1: 50n * 10n ** 18n, totalSupply: 10n ** 18n,
    })!;
    expect(aligned.swapped).toBe(false);
    const { reserve0, reserve1, rate0 } = poolBalances(aligned.pair);
    expect(reserve0!.toFixed()).toBe('200');
    expect(reserve1!.toFixed()).toBe('50');
    expect(rate0!.toFixed()).toBe('0.25');
    expect(poolValueAe(aligned.pair)!.toFixed()).toBe('100');
  });

  it('falls back to indexed data when the chain read is missing or does not match', () => {
    expect(alignPairWithChain(indexed, undefined)).toBeNull();
    expect(alignPairWithChain(indexed, { ...chain, token1: 'ct_other' })).toBeNull();
  });

  it('has no AE value for pools without an AE side', () => {
    expect(poolValueAe({ ...indexed, token0: token('ct_a', 'A', 18) })).toBeNull();
  });
});
