import {
  act, fireEvent, render, screen,
} from '@testing-library/react';
import {
  afterEach, expect, it, vi,
} from 'vitest';
import {
  TransactionNotificationBanner, TransactionNotificationProvider, TxPayloadType, useTransactionNotification,
} from '@/features/transaction-notification';
import { ShortsWalletRecovery } from '../shorts-wallet-recovery';
import type { WalletAction, WalletObservation } from '../shorts-wallet-journal';
import type { useShortsWalletTransactions } from '../use-shorts-wallet-transactions';

const mined = vi.hoisted(() => vi.fn());
vi.mock('@/utils/apiRead', () => ({ isTransactionMined: mined }));

const action: WalletAction = {
  version: 1,
  id: 'like-one',
  api: 'https://shorts.example',
  network: 'ae_uat',
  address: 'ak_creator',
  contract: 'ct_shorts',
  method: 'like',
  videoId: 'video-one',
  amount: '0',
  createdAt: 1,
  tx: 'th_like',
  submission: 'attempted',
  rawInner: 'tx_saved',
};
type Recovery = ReturnType<typeof useShortsWalletTransactions>;
const recovery = (overrides: Partial<Recovery> = {}): Recovery => ({
  action, notificationActive: true, observation: undefined, error: undefined, check: vi.fn(), release: vi.fn(), retrySponsorship: vi.fn(), run: vi.fn(), ...overrides,
});
const observation = (status: WalletObservation['status'], confirmations = 0): WalletObservation => ({
  ...action,
  tx: action.tx!,
  status,
  confirmations,
  confirmationsRequired: 3,
  result: ({ failed: 'revert', mined: 'ok', confirmed: 'ok' } as Record<string, string>)[status],
});
const OtherTransaction = () => {
  const { notifySubmitted, dismissNotification } = useTransactionNotification();
  return (
    <>
      <button type="button" onClick={() => notifySubmitted({ type: TxPayloadType.CreatePost, content: 'Hello' })}>Other transaction</button>
      <button type="button" onClick={dismissNotification}>Dismiss other notification</button>
    </>
  );
};
const App = ({ value, message, messageTone }: { value?: Recovery; message?: string; messageTone?: 'info' | 'success' | 'error' }) => (
  <TransactionNotificationProvider>
    <TransactionNotificationBanner />
    <OtherTransaction />
    {value && <ShortsWalletRecovery recovery={value} message={message} messageTone={messageTone} scope="creator" />}
  </TransactionNotificationProvider>
);

afterEach(() => vi.useRealTimers());

it('uses the standard wallet prompt with no extra transaction details or controls', () => {
  const value = recovery({ action: { ...action, tx: undefined } });
  render(<App value={value} />);
  expect(screen.getByText('Confirm in your wallet')).toBeInTheDocument();
  expect(screen.getByText('Sign the transaction to continue')).toBeInTheDocument();
  expect(screen.queryByText('Transaction details')).toBeNull();
  expect(screen.queryByRole('button', { name: /cancel wallet|check status|retry fee/i })).toBeNull();
  expect(screen.queryByLabelText('Wallet activity')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
  expect(screen.queryByText('Confirm in your wallet')).toBeNull();
  expect(value.release).not.toHaveBeenCalled();
  expect(value.run).not.toHaveBeenCalled();
});

it('completes at mining and dismisses without replay at depth three', () => {
  vi.useFakeTimers();
  const value = recovery({ observation: observation('submitted') });
  const view = render(<App value={value} />);
  expect(screen.getByText('Your Like is being confirmed.')).toBeInTheDocument();
  expect(screen.queryByText('Like confirmed')).toBeNull();
  expect(screen.queryByText('th_like')).toBeNull();
  expect(mined).not.toHaveBeenCalled();
  view.rerender(<App value={{ ...value, observation: observation('mined', 1) }} />);
  expect(screen.getByText('Like confirmed')).toBeInTheDocument();
  expect(screen.getByText('Done')).toBeInTheDocument();
  expect(screen.queryByText('View portfolio')).toBeNull();
  act(() => { vi.advanceTimersByTime(6000); });
  expect(screen.queryByText('Like confirmed')).toBeNull();
  view.rerender(<App value={{ ...value, observation: observation('confirmed', 3) }} />);
  expect(screen.queryByText('Like confirmed')).toBeNull();
  expect(value.release).not.toHaveBeenCalled();
});

it('dismisses the banner without discarding, signing or resubmitting a pending Like', () => {
  const value = recovery();
  const view = render(<App value={value} />);
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
  view.rerender(<App value={{ ...value, observation: observation('submitted') }} />);
  expect(screen.queryByText('Your Like is being confirmed.')).toBeNull();
  expect(value.retrySponsorship).not.toHaveBeenCalled();
  expect(value.check).not.toHaveBeenCalled();
  expect(value.release).not.toHaveBeenCalled();
  expect(value.run).not.toHaveBeenCalled();
});

it('returns to the standard pending state when a confirmed transaction is reorganized', () => {
  const value = recovery({ observation: observation('confirmed', 3) });
  const view = render(<App value={value} />);
  expect(screen.getByText('Like confirmed')).toBeInTheDocument();
  view.rerender(<App value={{ ...value, observation: observation('reorged') }} />);
  expect(screen.queryByText('Like confirmed')).toBeNull();
  expect(screen.getByText('Your Like is being confirmed.')).toBeInTheDocument();
});

it.each(['failed', 'neverSubmitted', 'sponsorshipExpired'] as const)('shows a standard error for %s without recovery controls', (outcome) => {
  vi.useFakeTimers();
  const value = recovery({ observation: { ...observation('failed'), [outcome]: true } });
  render(<App value={value} />);
  expect(screen.getByText(/Your Like.*Please try again/)).toBeInTheDocument();
  expect(screen.queryByText('Transaction details')).toBeNull();
  expect(screen.queryByRole('button', { name: /retry fee|check status|cancel wallet/i })).toBeNull();
  act(() => { vi.advanceTimersByTime(5000); });
  expect(screen.queryByText(/Your Like.*Please try again/)).toBeNull();
  expect(value.release).not.toHaveBeenCalled();
});

it('does not dismiss a newer shared notification when leaving Shorts', () => {
  const view = render(<App value={recovery()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Other transaction' }));
  view.rerender(<App />);
  expect(screen.getByText('Publishing post')).toBeInTheDocument();
});

it('clears feedback when the wallet scope changes', () => {
  const view = render(<App value={recovery({ observation: observation('confirmed', 3) })} />);
  view.rerender(<App value={recovery({
    action: {
      ...action, id: 'like-two', address: 'ak_other', tx: undefined,
    },
  })}
  />);
  expect(screen.queryByText('Like confirmed')).toBeNull();
  expect(screen.getByText('Confirm in your wallet')).toBeInTheDocument();
});

it.each([
  ['paid_like', 'Your Like', 'Like confirmed'],
  ['add_comment', 'Your comment', 'Comment published'],
  ['delete_comment', 'Your comment deletion', 'Comment deleted'],
  ['claim', 'Your reward claim', 'Rewards claimed to your wallet'],
  ['withdraw', 'Your withdrawal', 'Short withdrawn from official playback'],
] as const)('uses the shared banner throughout %s and completes on successful mining', (method, label, success) => {
  const value = recovery({ action: { ...action, method, tx: undefined } });
  const view = render(<App value={value} />);
  expect(screen.getByText('Confirm in your wallet')).toBeInTheDocument();
  view.rerender(<App value={{ ...value, action: { ...action, method }, observation: observation('submitted') }} />);
  expect(screen.getByText(`${label} is being confirmed.`)).toBeInTheDocument();
  expect(screen.queryByText(success)).toBeNull();
  view.rerender(<App value={{ ...value, action: { ...action, method }, observation: observation('mined', 1) }} />);
  expect(screen.getByText(success)).toBeInTheDocument();
  expect(screen.queryByText('Transaction details')).toBeNull();
  expect(screen.queryByRole('button', { name: /retry fee|check status|cancel wallet/i })).toBeNull();
  expect(value.release).not.toHaveBeenCalled();
});

it('uses standard pending, success and error feedback for Studio actions', () => {
  vi.useFakeTimers();
  const value = recovery({ action: undefined });
  const view = render(<App value={value} message="Loading private preview" />);
  expect(screen.getByText('Loading private preview')).toBeInTheDocument();
  view.rerender(<App value={value} message="Private review preview loaded." messageTone="success" />);
  expect(screen.getByText('Private review preview loaded.')).toBeInTheDocument();
  expect(screen.getByText('Done')).toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(6000); });
  expect(screen.queryByText('Private review preview loaded.')).toBeNull();
  view.rerender(<App value={value} message="Preview unavailable." messageTone="error" />);
  expect(screen.getByText('Action failed')).toBeInTheDocument();
  expect(screen.getByText('Preview unavailable.')).toBeInTheDocument();
  act(() => { vi.advanceTimersByTime(5000); });
  expect(screen.queryByText('Preview unavailable.')).toBeNull();
});

it('announces a repeated Studio action but does not resurrect older wallet feedback', () => {
  const value = recovery({ observation: observation('confirmed', 3) });
  const view = render(<App value={value} />);
  expect(screen.getByText('Like confirmed')).toBeInTheDocument();
  view.rerender(<App value={value} message="Refreshing your Studio" />);
  view.rerender(<App value={value} message="Account updated." messageTone="success" />);
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
  view.rerender(<App value={value} />);
  expect(screen.queryByText('Like confirmed')).toBeNull();
  view.rerender(<App value={value} message="Refreshing your Studio" />);
  expect(screen.getByText('Refreshing your Studio')).toBeInTheDocument();
  view.rerender(<App value={value} message="Account updated." messageTone="success" />);
  expect(screen.getByText('Account updated.')).toBeInTheDocument();
});

it('shows a journal recovery error even when no action could be loaded', () => {
  const value = recovery({ action: undefined, error: 'Wallet storage is unavailable.' });
  render(<App value={value} />);
  expect(screen.getByText('Wallet storage is unavailable.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
  expect(screen.queryByText('Wallet storage is unavailable.')).toBeNull();
});

it('announces a new wallet outcome after a Studio notification without replaying the old message', () => {
  const value = recovery({ observation: observation('submitted') });
  const view = render(<App value={value} />);
  view.rerender(<App value={value} message="Account updated." messageTone="success" />);
  expect(screen.getByText('Account updated.')).toBeInTheDocument();
  view.rerender(<App value={{ ...value, observation: observation('mined', 1) }} message="Account updated." messageTone="success" />);
  expect(screen.getByText('Like confirmed')).toBeInTheDocument();
  expect(screen.queryByText('Account updated.')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
  expect(screen.queryByText('Like confirmed')).toBeNull();
  expect(screen.queryByText('Account updated.')).toBeNull();
});

it('keeps restored terminal wallet activity silent across page reloads', () => {
  const value = recovery({ notificationActive: false });
  const first = render(<App value={value} />);
  expect(screen.queryByRole('button', { name: 'Dismiss notification' })).toBeNull();
  first.rerender(<App value={{ ...value, observation: observation('confirmed', 3) }} />);
  expect(screen.queryByText('Like confirmed')).toBeNull();
  first.unmount();
  render(<App value={{ ...value, observation: observation('confirmed', 3) }} />);
  expect(screen.queryByRole('button', { name: 'Dismiss notification' })).toBeNull();
  expect(value.release).not.toHaveBeenCalled();
});

it('still announces Studio actions while an old wallet outcome stays silent', () => {
  render(<App value={recovery({ notificationActive: false, observation: observation('confirmed', 3) })} message="Account updated." messageTone="success" />);
  expect(screen.getByText('Account updated.')).toBeInTheDocument();
  expect(screen.queryByText('Like confirmed')).toBeNull();
});

it.each(['revert', 'error'])('shows failure immediately for a mined %s', (result) => {
  render(<App value={recovery({ observation: { ...observation('mined', 1), result } })} />);
  expect(screen.getByText('Your Like could not be completed. Please try again.')).toBeInTheDocument();
  expect(screen.queryByText('Like confirmed')).toBeNull();
});
