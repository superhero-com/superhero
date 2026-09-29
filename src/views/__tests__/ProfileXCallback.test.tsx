import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act, fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import ProfileXCallback from '@/views/ProfileXCallback';
import {
  X_LINK_CHANGE_POLL_MS, X_LINK_CHANGE_TIMEOUT_MS,
  clearConfirmedXLinks, pendingXLinkChange,
} from '@/utils/confirmedXLink';
import { PENDING_TRANSACTIONS_STORAGE_KEY } from '@/features/pending-transactions/store';

const mockClaimXAddressLinkFromCode = vi.fn();
const mockGetAndClearXOAuthPKCE = vi.fn();
const mockAddStaticAccount = vi.fn();
const mockCompleteXAddressLink = vi.fn();
const mockNotifySubmitted = vi.fn();
const mockNotifyPending = vi.fn();
const mockGetAccount = vi.fn();
const mockNotifyConfirmed = vi.fn();
const mockNotifyError = vi.fn();

let mockActiveAccount = 'ak_other';

// The chain is asked before the API; these tests are about the API.
vi.mock('@/utils/apiRead', async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual, isTransactionMined: vi.fn().mockResolvedValue(false) };
});

vi.mock('@/features/transaction-notification', () => ({
  TxPayloadType: { LinkX: 'link_x', UnlinkX: 'unlink_x' },
  useTransactionNotification: () => ({
    notifySubmitted: (...args: any[]) => mockNotifySubmitted(...args),
    notifyPending: (...args: any[]) => mockNotifyPending(...args),
    notifyConfirmed: (...args: any[]) => mockNotifyConfirmed(...args),
    notifyError: (...args: any[]) => mockNotifyError(...args),
  }),
}));

vi.mock('@/hooks/useXPostingReward', () => ({
  X_POSTING_REWARD_QUERY_KEY: 'xPostingRewardStatus',
}));

vi.mock('@/api/backend', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    SuperheroApi: {
      claimXAddressLinkFromCode: (...args: any[]) => mockClaimXAddressLinkFromCode(...args),
      // The link tracker's question: does the account record show X yet?
      getAccount: (...args: any[]) => mockGetAccount(...args),
    },
  };
});

vi.mock('@/hooks/useAeSdk', () => ({
  useAeSdk: () => ({
    activeAccount: mockActiveAccount,
    addStaticAccount: (...args: any[]) => mockAddStaticAccount(...args),
  }),
}));

vi.mock('@/hooks/useProfile', () => ({
  useProfile: () => ({
    completeXAddressLink: (...args: any[]) => mockCompleteXAddressLink(...args),
  }),
}));

vi.mock('@/utils/xOAuth', () => ({
  isOurOAuthState: () => true,
  getAndClearXOAuthPKCE: (...args: any[]) => mockGetAndClearXOAuthPKCE(...args),
}));

const renderCallback = (ui: ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = (node: ReactElement) => (
    <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>
  );
  const view = render(wrapper(ui));
  return {
    ...view,
    queryClient,
    rerender: (node: ReactElement) => view.rerender(wrapper(node)),
  };
};

const CALLBACK_ROUTE = (
  <MemoryRouter initialEntries={['/profile/x/callback?code=abc&state=superhero_x_state_1']}>
    <Routes>
      <Route path="/profile/x/callback" element={<ProfileXCallback />} />
    </Routes>
  </MemoryRouter>
);

describe('ProfileXCallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActiveAccount = 'ak_other';

    mockGetAndClearXOAuthPKCE.mockReturnValue({
      state: 'superhero_x_state_1',
      codeVerifier: 'verifier',
      address: 'ak_test_1',
      redirectUri: 'http://localhost:5173/profile/x/callback',
    });

    mockClaimXAddressLinkFromCode.mockResolvedValue({
      message: 'link:ak_test_1:x:superherocom:0',
      nonce: 0,
      value: 'superherocom',
      verification_token: 'token',
    });

    mockCompleteXAddressLink.mockResolvedValue('th_x');
    // The backend has not indexed the link until a test says so.
    mockGetAccount.mockResolvedValue({ address: 'ak_test_1', links: {} });
    clearConfirmedXLinks();
  });

  afterEach(() => {
    clearConfirmedXLinks();
    vi.useRealTimers();
  });

  it('consumes PKCE storage only once even if wallet state causes rerender', async () => {
    const view = renderCallback(
      <MemoryRouter initialEntries={['/profile/x/callback?code=abc&state=superhero_x_state_1']}>
        <Routes>
          <Route path="/profile/x/callback" element={<ProfileXCallback />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockClaimXAddressLinkFromCode).toHaveBeenCalledTimes(1);
    });

    mockActiveAccount = 'ak_test_1';
    view.rerender(
      <MemoryRouter initialEntries={['/profile/x/callback?code=abc&state=superhero_x_state_1']}>
        <Routes>
          <Route path="/profile/x/callback" element={<ProfileXCallback />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockGetAndClearXOAuthPKCE).toHaveBeenCalledTimes(1);
      expect(mockClaimXAddressLinkFromCode).toHaveBeenCalledTimes(1);
    });
  });

  it('does not exchange the code when PKCE storage is missing', async () => {
    mockGetAndClearXOAuthPKCE.mockReturnValue(null);

    renderCallback(
      <MemoryRouter initialEntries={['/profile/x/callback?code=abc&state=superhero_x_state_1']}>
        <Routes>
          <Route path="/profile/x/callback" element={<ProfileXCallback />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockGetAndClearXOAuthPKCE).toHaveBeenCalledTimes(1);
    });
    expect(mockClaimXAddressLinkFromCode).not.toHaveBeenCalled();
    expect(mockAddStaticAccount).not.toHaveBeenCalled();
    expect(mockCompleteXAddressLink).not.toHaveBeenCalled();
  });

  it('does not re-add the wallet when the active account already matches', async () => {
    mockActiveAccount = 'ak_test_1';

    renderCallback(
      <MemoryRouter initialEntries={['/profile/x/callback?code=abc&state=superhero_x_state_1']}>
        <Routes>
          <Route path="/profile/x/callback" element={<ProfileXCallback />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockClaimXAddressLinkFromCode).toHaveBeenCalledTimes(1);
    });
    expect(mockAddStaticAccount).not.toHaveBeenCalled();
  });

  it('signs only after the user clicks the confirm button (user gesture)', async () => {
    renderCallback(
      <MemoryRouter initialEntries={['/profile/x/callback?code=abc&state=superhero_x_state_1']}>
        <Routes>
          <Route path="/profile/x/callback" element={<ProfileXCallback />} />
        </Routes>
      </MemoryRouter>,
    );

    // The confirm button appears once the code has been exchanged.
    const button = await screen.findByRole('button', { name: /sign in wallet to link/i });

    // Crucially, the blockchain signing must NOT be auto-triggered — otherwise
    // browsers would block the wallet pop-up.
    expect(mockCompleteXAddressLink).not.toHaveBeenCalled();

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockCompleteXAddressLink).toHaveBeenCalledTimes(1);
    });
  });

  it('re-enables the button so the user can retry after a failure', async () => {
    mockCompleteXAddressLink.mockRejectedValueOnce(new Error('popup blocked'));

    renderCallback(
      <MemoryRouter initialEntries={['/profile/x/callback?code=abc&state=superhero_x_state_1']}>
        <Routes>
          <Route path="/profile/x/callback" element={<ProfileXCallback />} />
        </Routes>
      </MemoryRouter>,
    );

    const button = await screen.findByRole('button', { name: /sign in wallet to link/i });
    fireEvent.click(button);

    // After the failure the button re-enables and offers a retry.
    const retry = await screen.findByRole('button', { name: /try again/i });
    expect(retry).not.toBeDisabled();

    fireEvent.click(retry);

    await waitFor(() => {
      expect(mockCompleteXAddressLink).toHaveBeenCalledTimes(2);
    });
  });

  describe('waiting on the chain', () => {
    it('tracks the link until the backend has it, instead of announcing success', async () => {
      renderCallback(CALLBACK_ROUTE);
      fireEvent.click(await screen.findByRole('button', { name: /sign in wallet to link/i }));

      // Previously the hash was discarded and this page said "X account linked"
      // before the chain had seen anything — the profile then showed nothing.
      await screen.findByText(/confirming on the blockchain/i);
      expect(screen.queryByRole('heading', { name: 'X account linked' })).not.toBeInTheDocument();
      expect(screen.getByText(/takes a while/i)).toBeInTheDocument();
      expect(screen.queryByText(/minutes/i)).not.toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();

      expect(mockNotifySubmitted).toHaveBeenCalledWith({ type: 'link_x' });
      const change = pendingXLinkChange('ak_test_1');
      expect(change).toMatchObject({ kind: 'link', txHash: 'th_x' });
      expect(mockNotifyPending).toHaveBeenCalledWith({ type: 'link_x', startedAt: change!.startedAt });
      expect(mockNotifyConfirmed).not.toHaveBeenCalled();
      // Kept for a reload of any page, not just this one.
      const stored = JSON.parse(window.localStorage.getItem(PENDING_TRANSACTIONS_STORAGE_KEY) || '[]');
      expect(stored).toEqual([expect.objectContaining({ kind: 'link_x', account: 'ak_test_1', txHash: 'th_x' })]);
      // Reaching the profile doesn't require waiting here.
      expect(screen.getByRole('button', { name: /go to profile/i })).toBeInTheDocument();
    });

    it('shows linked once the account record has the link, not merely once it is mined', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      renderCallback(CALLBACK_ROUTE);
      fireEvent.click(await screen.findByRole('button', { name: /sign in wallet to link/i }));
      await screen.findByText(/confirming on the blockchain/i);

      await act(async () => { vi.advanceTimersByTime(X_LINK_CHANGE_POLL_MS * 3); });
      expect(screen.queryByRole('heading', { name: 'X account linked' })).not.toBeInTheDocument();

      mockGetAccount.mockResolvedValue({ address: 'ak_test_1', links: { x: 'superherocom' } });
      await act(async () => { vi.advanceTimersByTime(X_LINK_CHANGE_POLL_MS); });

      expect(await screen.findByRole('heading', { name: 'X account linked' })).toBeInTheDocument();
      expect(pendingXLinkChange('ak_test_1')).toBeNull();
    });

    it('stops showing the wait once the link is given up on', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      renderCallback(CALLBACK_ROUTE);
      fireEvent.click(await screen.findByRole('button', { name: /sign in wallet to link/i }));
      await screen.findByText(/confirming on the blockchain/i);

      // The backend never shows the link.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(X_LINK_CHANGE_TIMEOUT_MS + X_LINK_CHANGE_POLL_MS);
      });

      expect(await screen.findByText(/taking longer than usual/i)).toBeInTheDocument();
      expect(screen.queryByText(/confirming on the blockchain/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'X account linked' })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /go to profile/i })).toBeInTheDocument();
    });

    it('falls back to linked when the backend returns no hash to poll', async () => {
      mockCompleteXAddressLink.mockResolvedValue(undefined);
      renderCallback(CALLBACK_ROUTE);
      fireEvent.click(await screen.findByRole('button', { name: /sign in wallet to link/i }));

      // A spinner with nothing to poll would never resolve.
      await screen.findByRole('heading', { name: 'X account linked' });
      expect(mockNotifyPending).not.toHaveBeenCalled();
      expect(mockNotifyConfirmed).toHaveBeenCalledWith({ type: 'link_x' });
      expect(pendingXLinkChange('ak_test_1')).toBeNull();
    });

    it('puts a failed signature in the top banner as well as on the page', async () => {
      mockCompleteXAddressLink.mockRejectedValueOnce(new Error('User rejected'));
      renderCallback(CALLBACK_ROUTE);
      fireEvent.click(await screen.findByRole('button', { name: /sign in wallet to link/i }));

      await screen.findByText('User rejected');
      expect(mockNotifyError).toHaveBeenCalledWith('User rejected');
      expect(mockNotifyPending).not.toHaveBeenCalled();
      expect(pendingXLinkChange('ak_test_1')).toBeNull();
    });
  });
});
