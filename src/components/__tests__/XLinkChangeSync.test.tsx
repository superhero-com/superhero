import { act, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { activeAccountAtom } from '@/atoms/accountAtoms';
import {
  X_LINK_CHANGES_STORAGE_KEY,
  X_LINK_CHANGE_POLL_MS,
  X_LINK_CHANGE_TIMEOUT_MS,
  clearConfirmedXLinks,
  pendingXLinkChange,
} from '@/utils/confirmedXLink';
import { XLinkChangeSync } from '../XLinkChangeSync';

const OWNER = 'ak_owner';
const mockGetAccount = vi.fn();
const mockNotifyPending = vi.fn();
const mockNotifyConfirmed = vi.fn();
const mockDismiss = vi.fn();
let mockNotificationState: any = { status: 'idle' };

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

vi.mock('@/features/transaction-notification', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useTransactionNotification: () => ({
      notificationState: mockNotificationState,
      notifyPending: (...args: any[]) => mockNotifyPending(...args),
      notifyConfirmed: (...args: any[]) => mockNotifyConfirmed(...args),
      dismissNotification: (...args: any[]) => mockDismiss(...args),
    }),
  };
});

// What a previous page load left behind.
const leftPending = (address: string, change: Record<string, unknown>) => {
  window.localStorage.setItem(X_LINK_CHANGES_STORAGE_KEY, JSON.stringify({ [address]: change }));
};

function renderSync(activeAccount: string | undefined = OWNER) {
  const store = createStore();
  store.set(activeAccountAtom, activeAccount);
  const queryClient = new QueryClient();
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
  const view = render(
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <XLinkChangeSync />
      </Provider>
    </QueryClientProvider>,
  );
  return { ...view, invalidate, store };
}

const invalidatedKeys = (spy: ReturnType<typeof vi.spyOn>) => spy.mock.calls
  .map(([filters]: any[]) => JSON.stringify(filters?.queryKey));

describe('XLinkChangeSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearConfirmedXLinks();
    mockNotificationState = { status: 'idle' };
    mockGetAccount.mockResolvedValue({ address: OWNER, links: { x: 'untracenetwork' } });
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    clearConfirmedXLinks();
    vi.useRealTimers();
  });

  it('after a reload, puts the unlink back in the banner with how long it has been', () => {
    const startedAt = Date.now() - 2 * 60_000;
    leftPending(OWNER, {
      kind: 'unlink', txHash: 'th_unlink', username: 'untracenetwork', startedAt,
    });
    renderSync();

    expect(mockNotifyPending).toHaveBeenCalledTimes(1);
    expect(mockNotifyPending).toHaveBeenCalledWith({ type: 'unlink_x', startedAt });
  });

  it('resumes waiting on the backend, then refreshes every X view and announces it once it has the change', async () => {
    const startedAt = Date.now() - 60_000;
    leftPending(OWNER, {
      kind: 'unlink', txHash: 'th_unlink', username: 'untracenetwork', startedAt,
    });
    // The banner is showing this unlink (the unlink was sent on this page load).
    mockNotificationState = { status: 'pending', payload: { type: 'unlink_x', startedAt }, txHash: '' };
    const { invalidate } = renderSync();
    await waitFor(() => expect(mockGetAccount).toHaveBeenCalledWith(OWNER, { cache: 'no-store' }));
    expect(pendingXLinkChange(OWNER)).not.toBeNull();
    expect(invalidate).not.toHaveBeenCalled();

    mockGetAccount.mockResolvedValue({ address: OWNER, links: {} });
    await act(async () => { await vi.advanceTimersByTimeAsync(X_LINK_CHANGE_POLL_MS); });

    await waitFor(() => expect(mockNotifyConfirmed).toHaveBeenCalledWith({ type: 'unlink_x', startedAt }));
    expect(pendingXLinkChange(OWNER)).toBeNull();
    expect(invalidatedKeys(invalidate).sort()).toEqual([
      '["AccountsService.getAccount","ak_owner"]',
      '["SuperheroApi.getProfile","ak_owner"]',
      // The feed / rewards cards read isXLinked from here.
      '["xPostingRewardStatus"]',
    ]);
  });

  it('announces a link the same way', async () => {
    const startedAt = Date.now();
    leftPending(OWNER, {
      kind: 'link', txHash: 'th_link', username: null, startedAt,
    });
    mockGetAccount.mockResolvedValue({ address: OWNER, links: {} });
    renderSync();
    expect(mockNotifyPending).toHaveBeenCalledWith({ type: 'link_x', startedAt });

    mockGetAccount.mockResolvedValue({ address: OWNER, links: { x: 'untracenetwork' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(X_LINK_CHANGE_POLL_MS); });

    await waitFor(() => expect(mockNotifyConfirmed).toHaveBeenCalledWith({ type: 'link_x', startedAt }));
  });

  it('leaves the banner alone while another transaction holds it', async () => {
    mockNotificationState = { status: 'pending', payload: { type: 'create_post', content: 'gm' }, txHash: 'th_post' };
    leftPending(OWNER, {
      kind: 'unlink', txHash: 'th_unlink', username: 'untracenetwork', startedAt: Date.now(),
    });
    const { invalidate } = renderSync();
    expect(mockNotifyPending).not.toHaveBeenCalled();

    mockGetAccount.mockResolvedValue({ address: OWNER, links: {} });
    await act(async () => { await vi.advanceTimersByTimeAsync(X_LINK_CHANGE_POLL_MS); });

    // The screens still update; the post's banner is not replaced.
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    expect(mockNotifyConfirmed).not.toHaveBeenCalled();
  });

  it("does not put another wallet's change in the banner, but still settles it", async () => {
    leftPending('ak_other', {
      kind: 'unlink', txHash: 'th_other', username: 'someone', startedAt: Date.now(),
    });
    mockGetAccount.mockResolvedValue({ address: 'ak_other', links: {} });
    const { invalidate } = renderSync(OWNER);

    expect(mockNotifyPending).not.toHaveBeenCalled();
    await waitFor(() => expect(pendingXLinkChange('ak_other')).toBeNull());
    expect(invalidatedKeys(invalidate)).toContain('["AccountsService.getAccount","ak_other"]');
    expect(mockNotifyConfirmed).not.toHaveBeenCalled();
  });

  it("never settles or dismisses this wallet's banner for another wallet's change", async () => {
    const mine = Date.now() - 30_000;
    const theirs = Date.now() - X_LINK_CHANGE_TIMEOUT_MS + X_LINK_CHANGE_POLL_MS;
    window.localStorage.setItem(X_LINK_CHANGES_STORAGE_KEY, JSON.stringify({
      [OWNER]: {
        kind: 'unlink', txHash: 'th_mine', username: 'untracenetwork', startedAt: mine,
      },
      // Left pending by a wallet this browser used before.
      ak_other: {
        kind: 'unlink', txHash: 'th_theirs', username: 'someone', startedAt: theirs,
      },
    }));
    mockGetAccount.mockImplementation(async (address: string) => (
      address === OWNER
        ? { address, links: { x: 'untracenetwork' } }
        : { address, links: {} }
    ));
    // The banner is showing this wallet's unlink.
    mockNotificationState = { status: 'pending', payload: { type: 'unlink_x', startedAt: mine }, txHash: '' };
    renderSync();

    // The other wallet's unlink settles at once; later it would time out.
    await waitFor(() => expect(pendingXLinkChange('ak_other')).toBeNull());
    await act(async () => { await vi.advanceTimersByTimeAsync(X_LINK_CHANGE_POLL_MS * 2); });

    expect(mockNotifyConfirmed).not.toHaveBeenCalled();
    expect(mockDismiss).not.toHaveBeenCalled();
    expect(pendingXLinkChange(OWNER)).not.toBeNull();
  });

  describe('switching wallets', () => {
    const WALLET_B = 'ak_wallet_b';

    it("clears the previous wallet's wait and never tells the new one it linked or unlinked", async () => {
      const startedAt = Date.now() - 30_000;
      leftPending(OWNER, {
        kind: 'unlink', txHash: 'th_owner', username: 'untracenetwork', startedAt,
      });
      // The banner is showing the owner's unlink.
      mockNotificationState = { status: 'pending', payload: { type: 'unlink_x', startedAt }, txHash: '' };
      const { store } = renderSync(OWNER);
      await waitFor(() => expect(mockGetAccount).toHaveBeenCalledWith(OWNER, { cache: 'no-store' }));

      act(() => { store.set(activeAccountAtom, WALLET_B); });

      // The owner's wait is not wallet B's.
      expect(mockDismiss).toHaveBeenCalledTimes(1);

      // The owner's unlink lands while wallet B is connected.
      mockGetAccount.mockResolvedValue({ address: OWNER, links: {} });
      await act(async () => { await vi.advanceTimersByTimeAsync(X_LINK_CHANGE_POLL_MS); });

      await waitFor(() => expect(pendingXLinkChange(OWNER)).toBeNull());
      expect(mockNotifyConfirmed).not.toHaveBeenCalled();
    });

    it("puts the new wallet's own wait in the banner in place of the previous one", () => {
      const ownerStarted = Date.now() - 30_000;
      const walletBStarted = Date.now() - 90_000;
      window.localStorage.setItem(X_LINK_CHANGES_STORAGE_KEY, JSON.stringify({
        [OWNER]: {
          kind: 'unlink', txHash: 'th_owner', username: 'untracenetwork', startedAt: ownerStarted,
        },
        [WALLET_B]: {
          kind: 'link', txHash: 'th_b', username: null, startedAt: walletBStarted,
        },
      }));
      mockNotificationState = { status: 'pending', payload: { type: 'unlink_x', startedAt: ownerStarted }, txHash: '' };
      const { store } = renderSync(OWNER);
      mockNotifyPending.mockClear();

      act(() => { store.set(activeAccountAtom, WALLET_B); });

      expect(mockNotifyPending).toHaveBeenCalledWith({ type: 'link_x', startedAt: walletBStarted });
    });

    it('leaves the banner alone when switching back to the wallet it belongs to', () => {
      const startedAt = Date.now() - 30_000;
      leftPending(OWNER, {
        kind: 'unlink', txHash: 'th_owner', username: 'untracenetwork', startedAt,
      });
      mockNotificationState = { status: 'pending', payload: { type: 'unlink_x', startedAt }, txHash: '' };
      renderSync(OWNER);

      expect(mockDismiss).not.toHaveBeenCalled();
      expect(mockNotifyPending).not.toHaveBeenCalled();
    });

    it('clears the wait from the banner when the wallet disconnects', async () => {
      const startedAt = Date.now() - 30_000;
      leftPending(OWNER, {
        kind: 'unlink', txHash: 'th_owner', username: 'untracenetwork', startedAt,
      });
      mockNotificationState = { status: 'pending', payload: { type: 'unlink_x', startedAt }, txHash: '' };
      const { store } = renderSync(OWNER);

      act(() => { store.set(activeAccountAtom, undefined); });

      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });
  });

  it('stops showing a change that never lands as on its way', async () => {
    const startedAt = Date.now() - X_LINK_CHANGE_TIMEOUT_MS + X_LINK_CHANGE_POLL_MS;
    leftPending(OWNER, {
      kind: 'unlink', txHash: 'th_dropped', username: 'untracenetwork', startedAt,
    });
    // The banner is showing this unlink.
    mockNotificationState = { status: 'pending', payload: { type: 'unlink_x', startedAt }, txHash: '' };
    renderSync();

    await act(async () => { await vi.advanceTimersByTimeAsync(X_LINK_CHANGE_POLL_MS * 2); });

    await waitFor(() => expect(mockDismiss).toHaveBeenCalledTimes(1));
    expect(mockNotifyConfirmed).not.toHaveBeenCalled();
    expect(pendingXLinkChange(OWNER)).toBeNull();
  });
});
