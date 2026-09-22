import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

import { useSocialGraph } from '../useSocialGraph';

const mockGetConfig = vi.fn();
const mockGetRelationship = vi.fn();
const mockPrecheck = vi.fn();
const mockInitialize = vi.fn();
const contractMethods = {
  follow: vi.fn(),
  unfollow: vi.fn(),
  block: vi.fn(),
  unblock: vi.fn(),
};

vi.mock('../../api/generated', () => ({
  // `classifySocialGraphError` narrows on this before reading the abort code.
  ApiError: class ApiError extends Error {},
  SocialGraphService: {
    getSocialGraphConfig: (...args: any[]) => mockGetConfig(...args),
    getSocialGraphRelationship: (...args: any[]) => mockGetRelationship(...args),
    precheckSocialGraphAction: (...args: any[]) => mockPrecheck(...args),
  },
}));

vi.mock('@aeternity/aepp-sdk', () => ({
  Contract: { initialize: (...args: any[]) => mockInitialize(...args) },
}));

vi.mock('../useAeSdk', () => ({
  useAeSdk: () => ({ activeAccount: 'ak_viewer', aeSdk: { getContext: () => ({}) } }),
}));

vi.mock('../useWalletConnect', () => ({
  useWalletConnect: () => ({ connectWallet: vi.fn(), walletConnected: true }),
}));

vi.mock('../../i18n', () => ({ default: { t: (key: string) => key } }));

const RELATIONSHIP_KEY = ['SocialGraphService.relationship', 'ak_viewer', 'ak_target'];
const NOT_FOLLOWING = {
  a_follows_b: false, b_follows_a: false, a_blocked_b: false, b_blocked_a: false,
};

function renderSocialGraph() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const view = renderHook(() => useSocialGraph('ak_target'), { wrapper });
  return { ...view, queryClient };
}

describe('useSocialGraph — a confirmed write is not undone by a lagging index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockResolvedValue({ contract_address: 'ct_social' });
    mockPrecheck.mockResolvedValue({ ok: true });
    mockInitialize.mockResolvedValue(contractMethods);
    Object.values(contractMethods).forEach((fn) => fn.mockResolvedValue(undefined));
    // The relationship route is served uncached from the index, which has not
    // necessarily seen the transaction yet — so it keeps answering with the
    // pre-write pair for a while after the write lands.
    mockGetRelationship.mockResolvedValue(NOT_FOLLOWING);
  });

  it('keeps the follow shown after a successful write instead of refetching stale truth', async () => {
    const { result, queryClient } = renderSocialGraph();

    await waitFor(() => expect(result.current.relationshipLoading).toBe(false));
    expect(result.current.isFollowing).toBe(false);
    expect(mockGetRelationship).toHaveBeenCalledTimes(1);

    await act(async () => { await result.current.follow(); });

    expect(contractMethods.follow).toHaveBeenCalledWith('ak_target');
    expect(result.current.isFollowing).toBe(true);
    expect(result.current.error).toBeNull();

    // The point of the test: a refetch here would answer NOT_FOLLOWING and snap
    // the button back, so the write must not trigger one.
    expect(mockGetRelationship).toHaveBeenCalledTimes(1);

    // Still marked stale, so the next remount or focus reconverges on chain truth.
    expect(queryClient.getQueryState(RELATIONSHIP_KEY)?.isInvalidated).toBe(true);
  });

  it('re-reads the relationship when the chain rejects the write', async () => {
    // A stale-state race classifies as silent: there the refetch is the fix, not
    // the bug, because the displayed state is what was wrong.
    contractMethods.follow.mockRejectedValueOnce(new Error('aborted with: ALREADY_FOLLOWING'));
    const { result } = renderSocialGraph();

    await waitFor(() => expect(result.current.relationshipLoading).toBe(false));
    await act(async () => { await result.current.follow(); });

    await waitFor(() => expect(mockGetRelationship).toHaveBeenCalledTimes(2));
    expect(result.current.isFollowing).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
