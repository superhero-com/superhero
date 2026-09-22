import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act, fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import ProfileXCallback from '@/views/ProfileXCallback';

const mockClaimXAddressLinkFromCode = vi.fn();
const mockGetAndClearXOAuthPKCE = vi.fn();
const mockAddStaticAccount = vi.fn();
const mockCompleteXAddressLink = vi.fn();
const mockNotifySubmitted = vi.fn();
const mockNotifyPendingTx = vi.fn();
const mockNotifyConfirmed = vi.fn();
const mockNotifyError = vi.fn();

let mockActiveAccount = 'ak_other';

vi.mock('@/features/transaction-notification', () => ({
  TxPayloadType: { LinkX: 'link_x' },
  useTransactionNotification: () => ({
    notifySubmitted: (...args: any[]) => mockNotifySubmitted(...args),
    notifyPendingTx: (...args: any[]) => mockNotifyPendingTx(...args),
    notifyConfirmed: (...args: any[]) => mockNotifyConfirmed(...args),
    notifyError: (...args: any[]) => mockNotifyError(...args),
  }),
}));

vi.mock('@/hooks/useXPostingReward', () => ({
  X_POSTING_REWARD_QUERY_KEY: 'xPostingRewardStatus',
}));

vi.mock('@/api/backend', () => ({
  SuperheroApi: {
    claimXAddressLinkFromCode: (...args: any[]) => mockClaimXAddressLinkFromCode(...args),
  },
}));

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

const invalidatedKeys = (spy: ReturnType<typeof vi.spyOn>) => spy.mock.calls
  .map(([filters]: any[]) => JSON.stringify(filters?.queryKey));

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
    it('tracks the returned transaction instead of announcing success', async () => {
      renderCallback(CALLBACK_ROUTE);
      fireEvent.click(await screen.findByRole('button', { name: /sign in wallet to link/i }));

      // Previously the hash was discarded and this page said "X account linked"
      // before the chain had seen anything — the profile then showed nothing.
      await screen.findByText(/confirming on the blockchain/i);
      expect(screen.queryByRole('heading', { name: 'X account linked' })).not.toBeInTheDocument();

      expect(mockNotifySubmitted).toHaveBeenCalledWith({ type: 'link_x' });
      expect(mockNotifyPendingTx).toHaveBeenCalledWith(
        { type: 'link_x' },
        'th_x',
        expect.objectContaining({ onConfirmed: expect.any(Function) }),
      );
      expect(mockNotifyConfirmed).not.toHaveBeenCalled();
      // Reaching the profile doesn't require waiting here.
      expect(screen.getByRole('button', { name: /go to profile/i })).toBeInTheDocument();
    });

    it('shows linked and refreshes profile + reward status once confirmed, then again as the indexer catches up', async () => {
      const { queryClient } = renderCallback(CALLBACK_ROUTE);
      const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
      fireEvent.click(await screen.findByRole('button', { name: /sign in wallet to link/i }));
      await screen.findByText(/confirming on the blockchain/i);
      expect(invalidate).not.toHaveBeenCalled();

      const { onConfirmed } = mockNotifyPendingTx.mock.calls[0][2];
      vi.useFakeTimers();
      try {
        act(() => onConfirmed());

        expect(screen.getByRole('heading', { name: 'X account linked' })).toBeInTheDocument();
        const expected = [
          '["SuperheroApi.getProfile","ak_test_1"]',
          '["AccountsService.getAccount","ak_test_1"]',
          // The feed / rewards cards read isXLinked from here.
          '["xPostingRewardStatus"]',
        ];
        expect(invalidatedKeys(invalidate).sort()).toEqual([...expected].sort());

        // Mined is not indexed: a refetch at the moment of confirmation can
        // still read the pre-link profile, so it refetches again.
        act(() => { vi.advanceTimersByTime(4_000); });
        expect(invalidate).toHaveBeenCalledTimes(6);
        act(() => { vi.advanceTimersByTime(8_000); });
        expect(invalidate).toHaveBeenCalledTimes(9);
      } finally {
        vi.useRealTimers();
      }
    });

    it('falls back to linked when the backend returns no hash to poll', async () => {
      mockCompleteXAddressLink.mockResolvedValue(undefined);
      renderCallback(CALLBACK_ROUTE);
      fireEvent.click(await screen.findByRole('button', { name: /sign in wallet to link/i }));

      // A spinner with nothing to poll would never resolve.
      await screen.findByRole('heading', { name: 'X account linked' });
      expect(mockNotifyPendingTx).not.toHaveBeenCalled();
      expect(mockNotifyConfirmed).toHaveBeenCalledWith({ type: 'link_x' });
    });

    it('puts a failed signature in the top banner as well as on the page', async () => {
      mockCompleteXAddressLink.mockRejectedValueOnce(new Error('User rejected'));
      renderCallback(CALLBACK_ROUTE);
      fireEvent.click(await screen.findByRole('button', { name: /sign in wallet to link/i }));

      await screen.findByText('User rejected');
      expect(mockNotifyError).toHaveBeenCalledWith('User rejected');
      expect(mockNotifyPendingTx).not.toHaveBeenCalled();
    });
  });
});
