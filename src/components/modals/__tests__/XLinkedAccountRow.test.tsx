import React from 'react';
import {
  fireEvent, render, screen, waitFor, within,
} from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { XLinkedAccountRow } from '../XLinkedAccountRow';

const mockUnlinkXAccount = vi.fn();
const mockRefreshXLinkState = vi.fn();
const mockNotifySubmitted = vi.fn();
const mockNotifyPendingTx = vi.fn();
const mockNotifyConfirmed = vi.fn();
const mockNotifyError = vi.fn();
let mockNotificationState: any = { status: 'idle' };

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ unlinkXAccount: (...args: any[]) => mockUnlinkXAccount(...args) }),
}));

vi.mock('@/hooks/useRefreshXLinkState', () => ({
  useRefreshXLinkState: () => (...args: any[]) => mockRefreshXLinkState(...args),
}));

vi.mock('@/features/transaction-notification', () => ({
  TxPayloadType: { UnlinkX: 'unlink_x', CreatePost: 'create_post' },
  useTransactionNotification: () => ({
    notificationState: mockNotificationState,
    notifySubmitted: (...args: any[]) => mockNotifySubmitted(...args),
    notifyPendingTx: (...args: any[]) => mockNotifyPendingTx(...args),
    notifyConfirmed: (...args: any[]) => mockNotifyConfirmed(...args),
    notifyError: (...args: any[]) => mockNotifyError(...args),
  }),
}));

const ADDRESS = 'ak_owner';

function setup(props: Partial<React.ComponentProps<typeof XLinkedAccountRow>> = {}) {
  const onUnlinked = vi.fn();
  const view = render(
    <XLinkedAccountRow address={ADDRESS} username="untracenetwork" onUnlinked={onUnlinked} {...props} />,
  );
  return { ...view, onUnlinked };
}

const openConfirm = () => {
  fireEvent.click(screen.getByRole('button', { name: /unlink @untracenetwork/i }));
  return screen.getByRole('dialog');
};

describe('XLinkedAccountRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationState = { status: 'idle' };
    mockUnlinkXAccount.mockResolvedValue('th_unlink');
  });

  it('asks before unlinking, and says what unlinking costs', () => {
    setup();
    expect(screen.getByText('@untracenetwork')).toBeInTheDocument();

    const dialog = openConfirm();
    expect(within(dialog).getByRole('heading', { name: 'Unlink your X account?' })).toBeInTheDocument();
    expect(dialog).toHaveTextContent('@untracenetwork will be removed from your SuperheroID');
    expect(dialog).toHaveTextContent(/stop earning X posting rewards/);
    expect(dialog).toHaveTextContent(/recorded on the blockchain/);

    // Opening the confirm must not touch the wallet or the chain.
    expect(mockUnlinkXAccount).not.toHaveBeenCalled();
    expect(mockNotifySubmitted).not.toHaveBeenCalled();
  });

  it('does nothing on cancel', async () => {
    setup();
    const dialog = openConfirm();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockUnlinkXAccount).not.toHaveBeenCalled();
    expect(mockNotifySubmitted).not.toHaveBeenCalled();
  });

  it('signs, then hands the transaction to the top banner to wait on the chain', async () => {
    const { onUnlinked } = setup();
    const dialog = openConfirm();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Unlink' }));

    await waitFor(() => expect(mockNotifyPendingTx).toHaveBeenCalledTimes(1));
    expect(mockNotifySubmitted).toHaveBeenCalledWith({ type: 'unlink_x' });
    expect(mockUnlinkXAccount).toHaveBeenCalledWith(ADDRESS);
    expect(mockNotifyPendingTx).toHaveBeenCalledWith(
      { type: 'unlink_x' },
      'th_unlink',
      expect.objectContaining({ onConfirmed: expect.any(Function) }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    // Not unlinked yet: the editor keeps showing the account until the chain confirms.
    expect(onUnlinked).not.toHaveBeenCalled();
    expect(mockRefreshXLinkState).not.toHaveBeenCalled();
  });

  it('switches the editor back and refreshes once the chain confirms', async () => {
    const { onUnlinked } = setup();
    fireEvent.click(within(openConfirm()).getByRole('button', { name: 'Unlink' }));
    await waitFor(() => expect(mockNotifyPendingTx).toHaveBeenCalled());

    mockNotifyPendingTx.mock.calls[0][2].onConfirmed();

    expect(onUnlinked).toHaveBeenCalledTimes(1);
    expect(mockRefreshXLinkState).toHaveBeenCalledWith(ADDRESS);
  });

  it('shows the unlink as confirming instead of offering it again while pending', () => {
    mockNotificationState = { status: 'pending', payload: { type: 'unlink_x' }, txHash: 'th_unlink' };
    setup();

    // Held in the global banner, so a closed-and-reopened editor still knows.
    expect(screen.getByRole('status')).toHaveTextContent('Unlinking your X account…');
    expect(screen.getByRole('status')).toHaveTextContent('Confirming on blockchain…');
    expect(screen.queryByRole('button', { name: /unlink/i })).not.toBeInTheDocument();
  });

  it('is unaffected by some other pending transaction', () => {
    mockNotificationState = { status: 'pending', payload: { type: 'create_post', content: 'gm' }, txHash: 'th_post' };
    setup();

    expect(screen.queryByText('Unlinking your X account…')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /unlink @untracenetwork/i })).toBeInTheDocument();
  });

  it('keeps the confirm open with the reason when signing fails, so retry is one tap', async () => {
    mockUnlinkXAccount.mockRejectedValueOnce(new Error('User rejected'));
    const { onUnlinked } = setup();
    const dialog = openConfirm();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Unlink' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('User rejected');
    expect(mockNotifyError).toHaveBeenCalledWith('User rejected');
    expect(mockNotifyPendingTx).not.toHaveBeenCalled();
    expect(onUnlinked).not.toHaveBeenCalled();

    const retry = within(dialog).getByRole('button', { name: 'Unlink' });
    expect(retry).not.toBeDisabled();
    fireEvent.click(retry);
    await waitFor(() => expect(mockUnlinkXAccount).toHaveBeenCalledTimes(2));
  });

  it('treats the unlink as done when the backend returns no hash to poll', async () => {
    mockUnlinkXAccount.mockResolvedValue(undefined);
    const { onUnlinked } = setup();
    fireEvent.click(within(openConfirm()).getByRole('button', { name: 'Unlink' }));

    await waitFor(() => expect(onUnlinked).toHaveBeenCalledTimes(1));
    expect(mockNotifyConfirmed).toHaveBeenCalledWith({ type: 'unlink_x' });
    expect(mockNotifyPendingTx).not.toHaveBeenCalled();
    expect(mockRefreshXLinkState).toHaveBeenCalledWith(ADDRESS);
  });

  it("offers no unlink on a profile you can't edit", () => {
    setup({ disabled: true });
    expect(screen.getByText('@untracenetwork')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /unlink/i })).not.toBeInTheDocument();
  });
});
