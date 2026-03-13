import { Provider } from 'jotai';
import { renderHook, act } from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { FlowWatcherProvider, useFlowWatcherContext } from '@/features/flow-watcher';

const mockGetTokenBalance = vi.fn();

vi.mock('@/hooks/useAeSdk', () => ({
  useAeSdk: () => ({
    sdk: {},
  }),
}));

vi.mock('@/libs/dex', async () => {
  const actual = await vi.importActual<any>('@/libs/dex');
  return {
    ...actual,
    getTokenBalance: (...args: any[]) => mockGetTokenBalance(...args),
  };
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider>
    <FlowWatcherProvider>{children}</FlowWatcherProvider>
  </Provider>
);

describe('FlowWatcherProvider', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockGetTokenBalance.mockReset();
  });

  it('auto-advances a balance condition step in background', async () => {
    mockGetTokenBalance.mockResolvedValue(200n);
    const { result } = renderHook(() => useFlowWatcherContext(), { wrapper });

    let flowId = '';
    act(() => {
      flowId = result.current.startFlow({
        flowType: 'buy_ae',
        steps: [
          {
            id: 'wait_balance',
            label: 'Wait for balance increase',
            kind: 'balance_condition',
            status: 'pending',
            balanceCondition: {
              tokenAddress: 'ct_token',
              account: 'ak_test',
              previousBalance: '100',
              expectedIncrease: '50',
            },
          },
        ],
      });
    });

    await act(async () => {
      vi.advanceTimersByTime(6000);
      await Promise.resolve();
    });

    const flow = result.current.getFlowById(flowId);
    expect(flow?.status).toBe('completed');
    expect(flow?.steps[0].status).toBe('confirmed');
  });
});
