import { describe, expect, it } from 'vitest';
import type { DexTokenDto } from '../../../../api/generated';
import {
  isActivelyTraded, isContractAddress, mergeTokens, tokenFromMiddleware,
} from '../tokenList';

const token = (overrides: Partial<DexTokenDto>) => ({
  address: 'ct_a', symbol: 'A', name: 'A', decimals: 18, is_ae: false, listed: false, summary: null, ...overrides,
}) as DexTokenDto;

describe('token list helpers', () => {
  it('validates contract addresses', () => {
    expect(isContractAddress('ct_7UfopTwsRuLGFEcsScbYgQ6YnySXuyMxQWhw6fjycnzS5Nyzq')).toBe(true);
    expect(isContractAddress('ak_7UfopTwsRuLGFEcsScbYgQ6YnySXuyMxQWhw6fjycnzS5Nyzq')).toBe(false);
    expect(isContractAddress('ct_short')).toBe(false);
  });

  it('treats tokens with trading volume, listed tokens and AE as active', () => {
    expect(isActivelyTraded(token({ is_ae: true }))).toBe(true);
    expect(isActivelyTraded(token({ listed: true }))).toBe(true);
    expect(isActivelyTraded(token({}))).toBe(false);
    expect(isActivelyTraded(token({ summary: { total_volume: { ae: '0' }, change: null } as any }))).toBe(false);
    expect(isActivelyTraded(token({ summary: { total_volume: { ae: '12.5' }, change: null } as any }))).toBe(true);
    expect(isActivelyTraded(token({
      summary: { total_volume: { ae: '0' }, change: { '24h': { volume: { ae: '3' } } } } as any,
    }))).toBe(true);
  });

  it('merges lists keeping the first token per address', () => {
    const merged = mergeTokens([token({ address: 'ct_a', symbol: 'A1' })], [token({ address: 'ct_a', symbol: 'A2' }), token({ address: 'ct_b' })]);
    expect(merged.map((item) => item.symbol)).toEqual(['A1', 'A']);
    expect(merged).toHaveLength(2);
  });

  it('maps middleware AEX9 metadata to a DEX token', () => {
    expect(tokenFromMiddleware({
      contract_id: 'ct_x', name: 'Token X', symbol: 'X', decimals: 6,
    })).toMatchObject({
      address: 'ct_x', name: 'Token X', symbol: 'X', decimals: 6, is_ae: false,
    });
    expect(tokenFromMiddleware({
      contract_id: 'ct_x', name: 'Bad', symbol: 'BAD', decimals: 18, invalid: true,
    })).toBeNull();
  });
});
