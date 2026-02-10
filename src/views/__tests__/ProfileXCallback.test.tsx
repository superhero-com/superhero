import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import ProfileXCallback from '@/views/ProfileXCallback';

const mockCreateXAttestationFromCode = vi.fn();
const mockGetAndClearXOAuthPKCE = vi.fn();
const mockAddStaticAccount = vi.fn();
const mockCompleteXWithAttestation = vi.fn();

let mockActiveAccount = 'ak_other';

vi.mock('@/api/backend', () => ({
  SuperheroApi: {
    createXAttestationFromCode: (...args: any[]) => mockCreateXAttestationFromCode(...args),
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
    completeXWithAttestation: (...args: any[]) => mockCompleteXWithAttestation(...args),
  }),
}));

vi.mock('@/utils/xOAuth', () => ({
  isOurOAuthState: () => true,
  getAndClearXOAuthPKCE: (...args: any[]) => mockGetAndClearXOAuthPKCE(...args),
}));

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

    mockCreateXAttestationFromCode.mockResolvedValue({
      x_username: 'tester',
      expiry: 12345,
      nonce: 'nonce',
      signature_hex: 'deadbeef',
    });

    mockCompleteXWithAttestation.mockResolvedValue('th_x');
  });

  it('consumes PKCE storage only once even if wallet state causes rerender', async () => {
    const view = render(
      <MemoryRouter initialEntries={['/profile/x/callback?code=abc&state=superhero_x_state_1']}>
        <Routes>
          <Route path="/profile/x/callback" element={<ProfileXCallback />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(mockCreateXAttestationFromCode).toHaveBeenCalledTimes(1);
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
      expect(mockCreateXAttestationFromCode).toHaveBeenCalledTimes(1);
    });
  });
});
