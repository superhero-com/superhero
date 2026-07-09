import type { ReactElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent, render, screen, waitFor,
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

let mockActiveAccount = 'ak_other';

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
    rerender: (node: ReactElement) => view.rerender(wrapper(node)),
  };
};

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
});
