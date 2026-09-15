import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

import { useXPostingReward } from '../useXPostingReward';

const mockGetStatus = vi.fn();
const mockRecheck = vi.fn();
const mockCreateChallenge = vi.fn();

vi.mock('@/api/backend', () => ({
  SuperheroApi: {
    getXPostingRewardStatus: (...args: any[]) => mockGetStatus(...args),
    runXPostingRewardRecheck: (...args: any[]) => mockRecheck(...args),
    createXRecheckChallenge: (...args: any[]) => mockCreateChallenge(...args),
    getXReferralLink: vi.fn(),
  },
}));

vi.mock('../useAeSdk', () => ({
  useAeSdk: () => ({
    activeAccount: 'ak_wallet',
    aeSdk: {},
    sdk: {},
    staticAeSdk: {},
    addStaticAccount: vi.fn(),
    signMessage: vi.fn(),
  }),
}));

vi.mock('../useWalletConnect', () => ({
  useWalletConnect: () => ({
    reconnectWallet: vi.fn(),
    connectingWallet: false,
    walletConnected: true,
    walletInfo: {},
  }),
}));

vi.mock('../useWalletReconnect', () => ({
  useWalletReconnect: () => async (address: string) => address,
}));

vi.mock('@/utils/signLinkMessage', () => ({
  signAndVerifyLinkMessage: vi.fn().mockResolvedValue('deadbeef'),
}));

vi.mock('@/i18n', () => ({
  default: { t: (key: string) => key },
}));

const paidStatus = {
  status: 'paid',
  onboarding_status: 'paid',
  x_username: 'someone',
  referral_link: 'https://superhero.com?ref=abc',
};

function wrapper(client: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

describe('useXPostingReward', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStatus.mockResolvedValue(paidStatus);
  });

  it('serves every surface on the page from a single status read', async () => {
    const client = makeClient();
    const Wrapper = wrapper(client);

    const first = renderHook(() => useXPostingReward(), { wrapper: Wrapper });
    const second = renderHook(() => useXPostingReward(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(first.result.current.status).toEqual(paidStatus);
      expect(second.result.current.status).toEqual(paidStatus);
    });

    // Three cards can be mounted at once; they must not each hit the API.
    expect(mockGetStatus).toHaveBeenCalledTimes(1);
  });

  it('publishes a recheck result to the other surfaces', async () => {
    const client = makeClient();
    const Wrapper = wrapper(client);
    mockGetStatus.mockResolvedValue({ ...paidStatus, status: 'pending' });
    mockCreateChallenge.mockResolvedValue({
      message: 'sign me',
      nonce: '1',
      expires_at: 123,
    });
    mockRecheck.mockResolvedValue(paidStatus);

    const page = renderHook(() => useXPostingReward(), { wrapper: Wrapper });
    const card = renderHook(() => useXPostingReward(), { wrapper: Wrapper });

    await waitFor(() => expect(card.result.current.status).not.toBeNull());
    expect(card.result.current.isOnboardingPaid).toBe(false);

    await act(async () => {
      await page.result.current.runRewardCheck();
    });

    // The card never refetched; it reads the value the page wrote.
    await waitFor(() => {
      expect(card.result.current.isOnboardingPaid).toBe(true);
    });
  });

  it('reports an unavailable status instead of an empty one', async () => {
    const client = makeClient();
    mockGetStatus.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useXPostingReward(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => expect(result.current.statusUnavailable).toBe(true));

    // A failed read must not masquerade as "this user has done nothing".
    expect(result.current.status).toBeNull();
    expect(result.current.isXLinked).toBe(false);
    expect(result.current.onboardingComplete).toBe(false);
  });
});
