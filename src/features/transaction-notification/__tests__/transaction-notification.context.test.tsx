import React from 'react';
import { act, renderHook } from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  TransactionNotificationProvider,
  TxPayloadType,
  useTransactionNotification,
} from '../transaction-notification.context';

const mockIsTransactionMined = vi.fn();

vi.mock('@/utils/apiRead', () => ({
  isTransactionMined: (...args: any[]) => mockIsTransactionMined(...args),
}));

const LINK_X = { type: TxPayloadType.LinkX } as const;
const POST = { type: TxPayloadType.CreatePost, content: 'gm' } as const;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TransactionNotificationProvider>{children}</TransactionNotificationProvider>
);

/** Lets the in-flight isTransactionMined promise settle. */
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); });

describe('notifyPendingTx onConfirmed', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockIsTransactionMined.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs once, when the poll first sees the transaction mined', async () => {
    mockIsTransactionMined
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const onConfirmed = vi.fn();
    const { result } = renderHook(() => useTransactionNotification(), { wrapper });

    act(() => result.current.notifyPendingTx(LINK_X, 'th_1', { onConfirmed }));
    await flush();
    expect(result.current.notificationState.status).toBe('pending');
    expect(onConfirmed).not.toHaveBeenCalled();

    await act(async () => { vi.advanceTimersByTime(5_000); });
    await flush();
    expect(result.current.notificationState.status).toBe('confirmed');
    expect(onConfirmed).toHaveBeenCalledTimes(1);

    // The poll is stopped; no second call however long it runs.
    await act(async () => { vi.advanceTimersByTime(30_000); });
    await flush();
    expect(onConfirmed).toHaveBeenCalledTimes(1);
  });

  it('does not run when a newer notification supersedes the pending one', async () => {
    let resolveMined!: (mined: boolean) => void;
    mockIsTransactionMined.mockReturnValueOnce(new Promise((r) => { resolveMined = r; }));
    const onConfirmed = vi.fn();
    const { result } = renderHook(() => useTransactionNotification(), { wrapper });

    act(() => result.current.notifyPendingTx(LINK_X, 'th_1', { onConfirmed }));
    act(() => result.current.notifySubmitted(POST));
    // The stale fetch lands after being superseded.
    await act(async () => { resolveMined(true); });
    await flush();

    expect(onConfirmed).not.toHaveBeenCalled();
    expect(result.current.notificationState).toEqual({ status: 'submitted', payload: POST });
  });

  it('still shows confirmed when the callback throws', async () => {
    mockIsTransactionMined.mockResolvedValue(true);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useTransactionNotification(), { wrapper });

    act(() => result.current.notifyPendingTx(LINK_X, 'th_1', {
      onConfirmed: () => { throw new Error('refresh failed'); },
    }));
    await flush();

    expect(result.current.notificationState).toEqual({ status: 'confirmed', payload: LINK_X });
    consoleError.mockRestore();
  });

  it('keeps working for callers that pass no options', async () => {
    mockIsTransactionMined.mockResolvedValue(true);
    const { result } = renderHook(() => useTransactionNotification(), { wrapper });

    act(() => result.current.notifyPendingTx(POST, 'th_2'));
    await flush();

    expect(result.current.notificationState).toEqual({ status: 'confirmed', payload: POST });
  });
});
