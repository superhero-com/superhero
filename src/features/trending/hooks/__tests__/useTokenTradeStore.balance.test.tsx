import { act, renderHook } from '@testing-library/react';
import { createStore, Provider, type PrimitiveAtom } from 'jotai';
import {
  describe, expect, it, vi,
} from 'vitest';
import { Decimal } from '@/libs/decimal';
import {
  isBuyingAtom, slippageAtom, tokenAAtom, tokenBAtom, userBalanceAtom,
} from '@/atoms/tokenTradeAtoms';
import { useTokenTradeStore } from '../useTokenTradeStore';

vi.mock('@/hooks', () => ({ useAccount: () => ({ decimalBalance: Decimal.from(100) }) }));

describe('Trade balance limits', () => {
  it('compares tokens spent against token balance when selling, independently of AE received', () => {
    const store = createStore();
    store.set(isBuyingAtom, false);
    store.set(userBalanceAtom as PrimitiveAtom<string | undefined>, '10');
    store.set(tokenAAtom as PrimitiveAtom<number | undefined>, 11);
    store.set(tokenBAtom as PrimitiveAtom<number | undefined>, 0.01);
    const { result } = renderHook(() => useTokenTradeStore(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });
    expect(result.current.isInsufficientBalance).toBe(true);
    act(() => {
      store.set(tokenAAtom as PrimitiveAtom<number | undefined>, 10);
      store.set(tokenBAtom as PrimitiveAtom<number | undefined>, 1000);
    });
    expect(result.current.isInsufficientBalance).toBe(false);
  });
  it('retains the AE reserve when checking a buy amount', () => {
    const store = createStore();
    store.set(isBuyingAtom, true);
    store.set(slippageAtom, 1);
    store.set(tokenAAtom as PrimitiveAtom<number | undefined>, 98);
    const { result } = renderHook(() => useTokenTradeStore(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });
    expect(result.current.spendableAeBalance.toString()).toBe('97.999');
    expect(result.current.isInsufficientBalance).toBe(true);
    act(() => store.set(tokenAAtom as PrimitiveAtom<number | undefined>, 97.999));
    expect(result.current.isInsufficientBalance).toBe(false);
  });
});
