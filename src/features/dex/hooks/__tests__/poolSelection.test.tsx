import { act, renderHook } from '@testing-library/react';
import {
  describe, expect, it, vi,
} from 'vitest';
import { PoolProvider, usePool } from '../../context/PoolProvider';
import type { LiquidityPosition } from '../../types/pool';

const account = vi.hoisted(() => ({ active: 'ak_first' as string | undefined }));
vi.mock('@/hooks', () => ({ useAccount: () => ({ activeAccount: account.active }) }));
describe('pool selection ownership', () => {
  it('clears the removal position and selected assets when the wallet changes or disconnects', () => {
    const { result, rerender } = renderHook(() => usePool(), { wrapper: PoolProvider });
    const position = {
      token0: 'ct_first', token1: 'ct_second', pair: { address: 'ct_pair' }, balance: '10',
    } as LiquidityPosition;
    act(() => result.current.selectPositionForRemove(position));
    expect(result.current.currentAction).toBe('remove');
    account.active = 'ak_second';
    rerender();
    expect(result.current.selectedPosition).toBeNull();
    expect(result.current.currentAction).toBeNull();
    expect(result.current.selectedTokenA).toBe('');
    act(() => result.current.selectPositionForAdd(position));
    account.active = undefined;
    rerender();
    expect(result.current.selectedPosition).toBeNull();
    expect(result.current.selectedTokenB).toBe('');
  });
});
