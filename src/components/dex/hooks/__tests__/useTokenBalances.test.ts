import { renderHook } from '@testing-library/react';
import {
  describe, expect, it, vi,
} from 'vitest';
import { CONFIG } from '../../../../config';
import { useTokenBalances } from '../useTokenBalances';

const mocks = vi.hoisted(() => ({ balance: '1000000000000000000', tokens: [] as { contract_id: string; amount: string }[] }));
vi.mock('@/hooks', () => ({
  useAccount: () => ({ balance: mocks.balance, aex9Balances: mocks.tokens }),
  useAeSdk: () => ({ activeAccount: 'ak_first', sdk: {} }),
}));
describe('wrap balances', () => {
  it('updates AE when only its balance changes, preserving the WAE base units', () => {
    mocks.tokens = [{ contract_id: CONFIG.DEX_WAE, amount: '2000000000000000003' }];
    const { result, rerender } = renderHook(() => useTokenBalances(null, null));
    expect(result.current.wrapBalances).toEqual({ ae: '1', wae: '2.000000000000000003' });
    mocks.balance = '3000000000000000000';
    rerender();
    expect(result.current.wrapBalances).toEqual({ ae: '3', wae: '2.000000000000000003' });
  });
});
