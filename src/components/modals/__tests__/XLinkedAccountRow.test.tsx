import React from 'react';
import {
  act, fireEvent, render, screen, waitFor, within,
} from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  X_LINK_CHANGES_STORAGE_KEY,
  X_LINK_CHANGE_POLL_MS,
  clearConfirmedXLinks,
  onXLinkChangeSettled,
  pendingXLinkChange,
  resolveXLink,
} from '@/utils/confirmedXLink';
import { PENDING_TRANSACTIONS_STORAGE_KEY } from '@/features/pending-transactions/store';
import { XLinkedAccountRow } from '../XLinkedAccountRow';
import { Dialog, DialogContent, DialogTitle } from '../../ui/dialog';

const mockUnlinkXAccount = vi.fn();

// The chain is asked before the API; these tests are about the API.
vi.mock('@/utils/apiRead', async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual, isTransactionMined: vi.fn().mockResolvedValue(false) };
});
const mockRefreshXLinkState = vi.fn();
const mockNotifySubmitted = vi.fn();
const mockNotifyPending = vi.fn();
const mockNotifyConfirmed = vi.fn();
const mockNotifyError = vi.fn();
const mockGetAccount = vi.fn();

// The tracker asks the backend's account record whether the unlink has
// landed; that record is what every other screen reads.
vi.mock('@/api/backend', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    SuperheroApi: {
      ...actual.SuperheroApi,
      getAccount: (...args: any[]) => mockGetAccount(...args),
    },
  };
});

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({ unlinkXAccount: (...args: any[]) => mockUnlinkXAccount(...args) }),
}));

vi.mock('@/hooks/useRefreshXLinkState', () => ({
  useRefreshXLinkState: () => (...args: any[]) => mockRefreshXLinkState(...args),
}));

vi.mock('@/features/transaction-notification', () => ({
  TxPayloadType: { LinkX: 'link_x', UnlinkX: 'unlink_x', CreatePost: 'create_post' },
  useTransactionNotification: () => ({
    notificationState: { status: 'idle' },
    notifySubmitted: (...args: any[]) => mockNotifySubmitted(...args),
    notifyPending: (...args: any[]) => mockNotifyPending(...args),
    notifyConfirmed: (...args: any[]) => mockNotifyConfirmed(...args),
    notifyError: (...args: any[]) => mockNotifyError(...args),
  }),
}));

const ADDRESS = 'ak_owner';
const linkedAccount = { address: ADDRESS, links: { x: 'untracenetwork' } };
const unlinkedAccount = { address: ADDRESS, links: {} };

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

const unlink = async () => {
  fireEvent.click(within(openConfirm()).getByRole('button', { name: 'Unlink' }));
  await waitFor(() => expect(mockNotifyPending).toHaveBeenCalled());
};

describe('XLinkedAccountRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearConfirmedXLinks();
    mockUnlinkXAccount.mockResolvedValue('th_unlink');
    // The backend has not caught up until a test says so.
    mockGetAccount.mockResolvedValue(linkedAccount);
  });

  afterEach(() => {
    // Stops any unlink still being tracked, so no poll outlives its test.
    clearConfirmedXLinks();
    vi.useRealTimers();
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

  it('signs, then shows the unlink as on its way, with the expected wait and a progress bar', async () => {
    const { onUnlinked } = setup();
    await unlink();

    expect(mockNotifySubmitted).toHaveBeenCalledWith({ type: 'unlink_x' });
    expect(mockUnlinkXAccount).toHaveBeenCalledWith(ADDRESS);
    const change = pendingXLinkChange(ADDRESS);
    expect(change).toMatchObject({ kind: 'unlink', txHash: 'th_unlink', username: 'untracenetwork' });
    // The banner shows the same wait, timed from the same moment.
    expect(mockNotifyPending).toHaveBeenCalledWith({ type: 'unlink_x', startedAt: change!.startedAt });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Unlinking @untracenetwork…');
    expect(status).toHaveTextContent('This takes a while. You can leave and come back, then refresh later.');
    expect(within(status).getByRole('progressbar')).toBeInTheDocument();
    // Neither "Unlink" again nor anything that reads as done.
    expect(screen.queryByRole('button', { name: /unlink/i })).not.toBeInTheDocument();
    expect(onUnlinked).not.toHaveBeenCalled();
    expect(mockNotifyConfirmed).not.toHaveBeenCalled();
  });

  it('keeps the unlink across a reload', async () => {
    setup();
    await unlink();

    const stored = JSON.parse(window.localStorage.getItem(PENDING_TRANSACTIONS_STORAGE_KEY) || '[]');
    expect(stored).toEqual([expect.objectContaining({
      kind: 'unlink_x', account: ADDRESS, txHash: 'th_unlink', meta: { username: 'untracenetwork' },
    })]);
  });

  it('stays on its way while the backend still lists the handle, then settles when it drops it', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const settled = vi.fn();
    const unsubscribe = onXLinkChangeSettled(settled);
    setup();
    await unlink();

    // Mined within seconds, but the account record has not caught up: still
    // on its way, however many times it is asked.
    await act(async () => { vi.advanceTimersByTime(X_LINK_CHANGE_POLL_MS * 6); });
    expect(screen.getByRole('status')).toHaveTextContent('Unlinking @untracenetwork…');
    expect(settled).not.toHaveBeenCalled();

    mockGetAccount.mockResolvedValue(unlinkedAccount);
    await act(async () => { vi.advanceTimersByTime(X_LINK_CHANGE_POLL_MS); });

    await waitFor(() => expect(settled).toHaveBeenCalledWith(
      expect.objectContaining({ address: ADDRESS, outcome: 'settled', username: null }),
    ));
    expect(pendingXLinkChange(ADDRESS)).toBeNull();
    expect(resolveXLink(ADDRESS, 'untracenetwork')).toBeNull();
    // Read fresh, not from the browser cache.
    expect(mockGetAccount).toHaveBeenCalledWith(ADDRESS, { cache: 'no-store' });
    unsubscribe();
  });

  it('shows an unlink sent before a reload as on its way', () => {
    window.localStorage.setItem(X_LINK_CHANGES_STORAGE_KEY, JSON.stringify({
      [ADDRESS]: {
        kind: 'unlink', txHash: 'th_unlink', username: 'untracenetwork', startedAt: Date.now() - 90_000,
      },
    }));
    setup();

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Unlinking @untracenetwork…');
    expect(status).toHaveTextContent('1:30');
    expect(screen.queryByRole('button', { name: /unlink/i })).not.toBeInTheDocument();
  });

  it('is unaffected by a link on its way for some other wallet', () => {
    window.localStorage.setItem(X_LINK_CHANGES_STORAGE_KEY, JSON.stringify({
      ak_other: {
        kind: 'unlink', txHash: 'th_other', username: 'someone', startedAt: Date.now(),
      },
    }));
    setup();

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /unlink @untracenetwork/i })).toBeInTheDocument();
  });

  it('keeps the confirm open with the reason when signing fails, so retry is one tap', async () => {
    mockUnlinkXAccount.mockRejectedValueOnce(new Error('User rejected'));
    const { onUnlinked } = setup();
    const dialog = openConfirm();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Unlink' }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent('User rejected');
    expect(mockNotifyError).toHaveBeenCalledWith('User rejected');
    expect(mockNotifyPending).not.toHaveBeenCalled();
    expect(pendingXLinkChange(ADDRESS)).toBeNull();
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
    expect(mockNotifyPending).not.toHaveBeenCalled();
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
