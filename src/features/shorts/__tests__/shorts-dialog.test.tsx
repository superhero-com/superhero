import { fireEvent, render, screen } from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  TransactionNotificationBanner, TransactionNotificationProvider, TxPayloadType, useTransactionNotification,
} from '@/features/transaction-notification';
import { ShortsDialog } from '../shorts-dialog';

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function showModal() { this.open = true; };
  HTMLDialogElement.prototype.close = function close() { this.open = false; };
});

describe('Shorts wallet handoff', () => {
  it('releases the native top layer for wallet confirmation and restores the review after rejection', () => {
    const onClose = vi.fn();
    const review = (suspended: boolean, busy: boolean) => (
      <ShortsDialog label="Hosting purchase" suspended={suspended} busy={busy} onClose={onClose}>
        <input aria-label="Budget" defaultValue="0.1" />
      </ShortsDialog>
    );
    const { container, rerender } = render(review(false, false));
    const dialog = container.querySelector('dialog')!;
    fireEvent.change(screen.getByLabelText('Budget'), { target: { value: '0.2' } });
    expect(dialog.open).toBe(true);
    rerender(review(true, true));
    expect(dialog.open).toBe(false);
    expect(onClose).not.toHaveBeenCalled();
    rerender(review(false, false));
    expect(dialog.open).toBe(true);
    expect((screen.getByLabelText('Budget') as HTMLInputElement).value).toBe('0.2');
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

const Notify = () => {
  const { notifyPending } = useTransactionNotification();
  return (
    <button
      type="button"
      onClick={() => notifyPending({
        type: TxPayloadType.ShortsAction, id: 'comment', wallet: true, pendingTitle: 'Confirming on blockchain', pendingMessage: 'Your comment is being confirmed.', confirmedTitle: 'Comment published',
      })}
    >
      Notify
    </button>
  );
};

it('keeps the shared banner in the active dialog top layer and restores it during wallet handoff', () => {
  const app = (open: boolean, suspended = false) => (
    <TransactionNotificationProvider>
      <TransactionNotificationBanner />
      <Notify />
      {open && <ShortsDialog label="Comments" busy={false} suspended={suspended} onClose={vi.fn()}><textarea aria-label="Comment draft" defaultValue="Keep my draft" /></ShortsDialog>}
    </TransactionNotificationProvider>
  );
  const view = render(app(true));
  fireEvent.click(screen.getByRole('button', { name: 'Notify' }));
  expect(screen.getByRole('dialog')).toContainElement(screen.getByRole('button', { name: 'Dismiss notification' }));
  view.rerender(app(true, true));
  expect(view.container.querySelector('dialog')).not.toContainElement(screen.getByRole('button', { name: 'Dismiss notification' }));
  view.rerender(app(true));
  expect(screen.getByRole('dialog')).toContainElement(screen.getByRole('button', { name: 'Dismiss notification' }));
  expect(screen.getByLabelText('Comment draft')).toHaveValue('Keep my draft');
  view.rerender(app(false));
  expect(screen.getByText('Your comment is being confirmed.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
  expect(screen.queryByText('Your comment is being confirmed.')).toBeNull();
});
