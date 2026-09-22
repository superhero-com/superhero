import React from 'react';
import {
  act, fireEvent, render, screen, waitFor, within,
} from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { clearConfirmedXLinks, resolveXLink } from '@/utils/confirmedXLink';
import { XLinkedAccountRow } from '../XLinkedAccountRow';
import { Dialog, DialogContent, DialogTitle } from '../../ui/dialog';

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
    clearConfirmedXLinks();
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
    // Remembered, so a reopened editor that re-reads a not-yet-indexed account
    // record does not show the account as linked again.
    expect(resolveXLink(ADDRESS, 'untracenetwork')).toBeNull();
  });

  it('does not remember an unlink the chain has not confirmed', async () => {
    setup();
    fireEvent.click(within(openConfirm()).getByRole('button', { name: 'Unlink' }));
    await waitFor(() => expect(mockNotifyPendingTx).toHaveBeenCalled());

    expect(resolveXLink(ADDRESS, 'untracenetwork')).toBe('untracenetwork');
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

  describe('inside the profile editor', () => {
    // The confirm is a dialog opened from inside the editor's own dialog.
    const renderInEditor = () => {
      const onEditorOpenChange = vi.fn();
      const onUnlinked = vi.fn();
      render(
        <Dialog open onOpenChange={onEditorOpenChange}>
          <DialogContent>
            <DialogTitle>Edit profile</DialogTitle>
            <XLinkedAccountRow address={ADDRESS} username="untracenetwork" onUnlinked={onUnlinked} />
          </DialogContent>
        </Dialog>,
      );
      return { onEditorOpenChange, onUnlinked };
    };
    const confirmDialog = () => screen.getByRole('dialog', { name: 'Unlink your X account?' });

    it('Escape closes only the confirm, never the editor behind it', async () => {
      const { onEditorOpenChange } = renderInEditor();
      fireEvent.click(screen.getByRole('button', { name: /unlink @untracenetwork/i }));
      expect(confirmDialog()).toBeInTheDocument();

      fireEvent.keyDown(confirmDialog(), { key: 'Escape' });

      await waitFor(() => expect(
        screen.queryByRole('dialog', { name: 'Unlink your X account?' }),
      ).not.toBeInTheDocument());
      expect(screen.getByRole('dialog', { name: 'Edit profile' })).toBeInTheDocument();
      expect(onEditorOpenChange).not.toHaveBeenCalled();
    });

    it('cannot be dismissed while the wallet prompt is out', async () => {
      let finishSigning: (hash: string) => void = () => {};
      mockUnlinkXAccount.mockReturnValue(new Promise((resolve) => { finishSigning = resolve; }));
      const { onEditorOpenChange } = renderInEditor();
      fireEvent.click(screen.getByRole('button', { name: /unlink @untracenetwork/i }));
      fireEvent.click(within(confirmDialog()).getByRole('button', { name: 'Unlink' }));
      await waitFor(() => expect(mockUnlinkXAccount).toHaveBeenCalled());

      fireEvent.keyDown(confirmDialog(), { key: 'Escape' });

      expect(confirmDialog()).toBeInTheDocument();
      expect(onEditorOpenChange).not.toHaveBeenCalled();
      await act(async () => { finishSigning('th_unlink'); });
    });

    it('closes the confirm cleanly once signed, leaving the editor usable', async () => {
      const { onEditorOpenChange } = renderInEditor();
      fireEvent.click(screen.getByRole('button', { name: /unlink @untracenetwork/i }));
      fireEvent.click(within(confirmDialog()).getByRole('button', { name: 'Unlink' }));

      await waitFor(() => expect(
        screen.queryByRole('dialog', { name: 'Unlink your X account?' }),
      ).not.toBeInTheDocument());
      expect(screen.getByRole('dialog', { name: 'Edit profile' })).toBeInTheDocument();
      expect(onEditorOpenChange).not.toHaveBeenCalled();
    });
  });

  it("offers no unlink on a profile you can't edit", () => {
    setup({ disabled: true });
    expect(screen.getByText('@untracenetwork')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /unlink/i })).not.toBeInTheDocument();
  });
});
