import React, { useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'jotai';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  TransactionNotificationBanner,
  TransactionNotificationProvider,
  TxPayloadType,
  useTransactionNotification,
} from '@/features/transaction-notification';
import {
  XLinkChangePending,
  formatXLinkChangeElapsed,
  xLinkChangeProgress,
} from '../XLinkChangePending';

const MINUTE = 60_000;

describe('X link change progress', () => {
  it('fills over the six minutes people are told to expect', () => {
    expect(xLinkChangeProgress(0)).toBe(0);
    expect(xLinkChangeProgress(3 * MINUTE)).toBeCloseTo(0.5);
  });

  it('never fills on time alone: only the backend catching up ends the wait', () => {
    expect(xLinkChangeProgress(6 * MINUTE)).toBe(0.95);
    expect(xLinkChangeProgress(30 * MINUTE)).toBe(0.95);
  });

  it('shows the time so far as m:ss', () => {
    expect(formatXLinkChangeElapsed(0)).toBe('0:00');
    expect(formatXLinkChangeElapsed(65_000)).toBe('1:05');
    expect(formatXLinkChangeElapsed(6 * MINUTE + 1_000)).toBe('6:01');
  });
});

describe('XLinkChangePending', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('says what is happening, how long it usually takes, and moves', () => {
    render(
      <XLinkChangePending change={{
        kind: 'unlink', txHash: 'th_1', username: 'untracenetwork', startedAt: Date.now(),
      }}
      />,
    );
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Unlinking @untracenetwork…');
    expect(status).toHaveTextContent('Waiting for the blockchain. This usually takes 2–6 minutes.');
    expect(status).toHaveTextContent('0:00');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

    act(() => { vi.advanceTimersByTime(3 * MINUTE); });
    expect(status).toHaveTextContent('3:00');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
  });

  it('is honest once the wait runs past the estimate', () => {
    render(
      <XLinkChangePending change={{
        kind: 'link', txHash: 'th_1', username: null, startedAt: Date.now() - 7 * MINUTE,
      }}
      />,
    );
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Linking your X account…');
    expect(status).toHaveTextContent('Taking longer than usual');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '95');
  });
});

describe('the top banner for an X link change', () => {
  const Trigger = ({ payload }: { payload: Parameters<ReturnType<typeof useTransactionNotification>['notifyPending']>[0] }) => {
    const { notifyPending } = useTransactionNotification();
    useEffect(() => { notifyPending(payload); }, [notifyPending, payload]);
    return null;
  };

  const renderBanner = (payload: any) => render(
    <Provider>
      <TransactionNotificationProvider>
        <TransactionNotificationBanner />
        <Trigger payload={payload} />
      </TransactionNotificationProvider>
    </Provider>,
  );

  it('shows the expected wait and a progress bar, timed from when it was sent', () => {
    renderBanner({ type: TxPayloadType.UnlinkX, startedAt: Date.now() - 2 * MINUTE });

    expect(screen.getByText('Unlinking your X account…')).toBeInTheDocument();
    expect(screen.getByText('Waiting for the blockchain. This usually takes 2–6 minutes.')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33');
    expect(screen.getByText('2:00')).toBeInTheDocument();
  });

  it('keeps the plain confirming state for a payload without a start time', () => {
    renderBanner({ type: TxPayloadType.LinkX });

    expect(screen.getByText('Linking your X account…')).toBeInTheDocument();
    expect(screen.getByText('Confirming on blockchain…')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
