import { useEffect } from 'react';
import {
  act, fireEvent, render, screen, waitFor,
} from '@testing-library/react';
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
import { XLinkChangePending } from '@/components/XLinkChangePending';
import {
  PendingTransaction,
  formatPendingElapsed,
  pendingTransactionProgress,
} from '../PendingTransaction';
import {
  PENDING_TRANSACTION_POLL_MS,
  clearPendingTransactions,
  trackPendingTransaction,
} from '../store';

const MINUTE = 60_000;
const TAKES_A_WHILE = 'This takes a while. You can leave and come back, then refresh later.';

const mockIsMined = vi.fn();
vi.mock('@/utils/apiRead', async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual, isTransactionMined: (...args: any[]) => mockIsMined(...args) };
});

describe('pending transaction progress', () => {
  it('fills by real steps, not by a guess at the time left', () => {
    expect(pendingTransactionProgress('sent')).toBe(33);
    expect(pendingTransactionProgress('confirmed')).toBe(67);
    expect(pendingTransactionProgress('live')).toBe(100);
  });

  it('shows the time so far as m:ss', () => {
    expect(formatPendingElapsed(0)).toBe('0:00');
    expect(formatPendingElapsed(65_000)).toBe('1:05');
    expect(formatPendingElapsed(12 * MINUTE + 1_000)).toBe('12:01');
  });
});

describe('PendingTransaction', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('says what is happening and that it takes a while, without promising a time', () => {
    render(<PendingTransaction title="Creating #SUPERHERO" stage="sent" startedAt={Date.now()} />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Creating #SUPERHERO');
    expect(status).toHaveTextContent('Waiting for the blockchain…');
    expect(status).toHaveTextContent(TAKES_A_WHILE);
    expect(status).not.toHaveTextContent(/minute|min\b|\d+\s*[–-]\s*\d+/);
    expect(status).toHaveTextContent('Sent');
    expect(status).toHaveTextContent('Confirmed');
    expect(status).toHaveTextContent('Live');
    expect(screen.getByRole('progressbar', { name: 'Transaction progress' }))
      .toHaveAttribute('aria-valuenow', '33');
    expect(status).toHaveTextContent('0:00');

    act(() => { vi.advanceTimersByTime(3 * MINUTE); });
    expect(status).toHaveTextContent('3:00');
  });

  it('says so once it is in a block', () => {
    render(<PendingTransaction title="Linking your X account…" stage="confirmed" startedAt={Date.now()} />);

    expect(screen.getByRole('status')).toHaveTextContent('Confirmed on the blockchain. Updating Superhero…');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67');
  });

  it('stops asking for patience once it is live', () => {
    render(<PendingTransaction title="Creating #SUPERHERO" stage="live" startedAt={Date.now()} />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Done!');
    expect(status).not.toHaveTextContent(TAKES_A_WHILE);
    expect(status).not.toHaveTextContent('0:00');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('can be dismissed where the page allows it', () => {
    const onDismiss = vi.fn();
    render(<PendingTransaction title="Creating #SUPERHERO" stage="sent" onDismiss={onDismiss} />);

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe('XLinkChangePending', () => {
  it('is the same card, named for the change and at its step', () => {
    render(
      <XLinkChangePending change={{
        kind: 'unlink', txHash: 'th_1', username: 'untracenetwork', startedAt: Date.now(), step: 'confirmed',
      }}
      />,
    );
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Unlinking @untracenetwork…');
    expect(status).toHaveTextContent(TAKES_A_WHILE);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67');
  });
});

describe('the top banner for a tracked transaction', () => {
  const Trigger = ({ payload }: { payload: any }) => {
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

  beforeEach(() => {
    clearPendingTransactions();
    mockIsMined.mockResolvedValue(false);
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    clearPendingTransactions();
    vi.useRealTimers();
  });

  it('shows the same card, named from what is tracked, and follows its steps', async () => {
    const tracked = trackPendingTransaction(
      {
        kind: 'unlink_x', account: 'ak_owner', txHash: 'th_unlink', meta: { username: 'untracenetwork' },
      },
      { resolve: async () => undefined },
    );
    renderBanner({ type: TxPayloadType.UnlinkX, startedAt: tracked.startedAt });

    expect(screen.getByText('Unlinking @untracenetwork…')).toBeInTheDocument();
    expect(screen.getByText('Waiting for the blockchain…')).toBeInTheDocument();
    expect(screen.getByText(TAKES_A_WHILE)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33');

    mockIsMined.mockResolvedValue(true);
    await act(async () => { await vi.advanceTimersByTimeAsync(PENDING_TRANSACTION_POLL_MS); });

    await waitFor(() => expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '67'));
    expect(screen.getByText('Confirmed on the blockchain. Updating Superhero…')).toBeInTheDocument();
  });

  it('shows a token creation the same way', () => {
    const tracked = trackPendingTransaction(
      {
        kind: 'create_token', account: 'ak_owner', txHash: 'th_create', meta: { tokenName: 'SUPERHERO' },
      },
      { resolve: async () => undefined },
    );
    renderBanner({ type: TxPayloadType.CreateToken, tokenName: 'SUPERHERO', startedAt: tracked.startedAt });

    expect(screen.getByText('Creating #SUPERHERO')).toBeInTheDocument();
    expect(screen.getByText(TAKES_A_WHILE)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33');
  });

  it('keeps the plain confirming state for a payload without a start time', () => {
    renderBanner({ type: TxPayloadType.LinkX });

    expect(screen.getByText('Linking your X account…')).toBeInTheDocument();
    expect(screen.getByText('Confirming on blockchain…')).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
