import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

import {
  useSocialGraph, useSocialGraphCounts, graphCountsKey, relationshipKey,
} from '../useSocialGraph';

const mockGetConfig = vi.fn();
const mockGetRelationship = vi.fn();
const mockPrecheck = vi.fn();
const mockInitialize = vi.fn();
const mockNetwork = vi.fn();
const mockCounts = vi.fn();
const socket = vi.hoisted(() => ({ updates: new Set<(event: any) => void>(), connections: new Set<() => void>() }));
vi.mock('../../libs/WebSocketClient', () => ({
  default: {
    subscribeForSocialGraphUpdates: (fn: any) => { socket.updates.add(fn); return () => socket.updates.delete(fn); },
    subscribeForConnection: (fn: any) => { socket.connections.add(fn); return () => socket.connections.delete(fn); },
  },
}));
const notifications = vi.hoisted(() => ({
  notifySubmitted: vi.fn(), notifyConfirmed: vi.fn(), notifyError: vi.fn(), dismissNotification: vi.fn(),
}));
vi.mock('../../features/transaction-notification', () => ({
  useTransactionNotification: () => notifications,
  TxPayloadType: { SocialGraph: 'social_graph' },
}));
vi.mock('../../api/socialGraphPolicy', () => ({
  getCurrentSocialGraphConfig: (...args: any[]) => mockGetConfig(...args),
  getSocialGraphCounts: (...args: any[]) => mockCounts(...args),
}));
vi.mock('../../config', () => ({ CONFIG: { NETWORK: 'ae_mainnet' } }));
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
  useAeSdk: () => ({ activeAccount: 'ak_viewer', sdk: { getContext: () => ({ selectedSigner: true }), getNodeInfo: async () => ({ nodeNetworkId: await mockNetwork() }) }, aeSdk: { getContext: () => { throw new Error('Wrong wallet SDK'); } } }),
}));

vi.mock('../useWalletConnect', () => ({
  useWalletConnect: () => ({ connectWallet: vi.fn(), walletConnected: true }),
}));

vi.mock('../../i18n', () => ({ default: { t: (key: string) => key } }));

const RELATIONSHIP_KEY = relationshipKey('ak_viewer', 'ak_target', 'ct_social');
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
    vi.resetAllMocks();
    mockGetConfig.mockResolvedValue({
      contract_address: 'ct_social', network_id: 'ae_mainnet', frozen: false, importing: false,
    });
    mockNetwork.mockResolvedValue('ae_mainnet');
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

    await waitFor(() => expect(result.current.relationship).toEqual(NOT_FOLLOWING));
    expect(result.current.isFollowing).toBe(false);
    expect(mockGetRelationship).toHaveBeenCalledTimes(1);

    await act(async () => { await result.current.follow(); });

    expect(contractMethods.follow).toHaveBeenCalledWith('ak_target');
    expect(mockInitialize).toHaveBeenCalledWith(expect.objectContaining({ selectedSigner: true }));
    expect(mockGetConfig).toHaveBeenCalledTimes(2);
    expect(notifications.notifySubmitted).toHaveBeenCalledWith(expect.objectContaining({ action: 'follow' }));
    expect(notifications.notifyConfirmed).toHaveBeenCalled();
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

    await waitFor(() => expect(result.current.relationship).toEqual(NOT_FOLLOWING));
    await act(async () => { await result.current.follow(); });

    await waitFor(() => expect(mockGetRelationship).toHaveBeenCalledTimes(2));
    expect(result.current.isFollowing).toBe(false);
    expect(result.current.error).toBeNull();
  });
  it('refuses to sign after contract cutover and refreshes the cached identity', async () => {
    const { result } = renderSocialGraph();
    await waitFor(() => expect(result.current.relationship).toEqual(NOT_FOLLOWING));
    mockGetConfig.mockResolvedValue({
      contract_address: 'ct_replacement', network_id: 'ae_mainnet', frozen: false, importing: false,
    });
    await act(async () => { await result.current.follow(); });
    expect(mockInitialize).not.toHaveBeenCalled();
    expect(mockPrecheck).not.toHaveBeenCalled();
    expect(result.current.error?.message).toContain('contractChanged');
  });

  it.each([
    ['FROZEN', { frozen: true }, 'ae_mainnet', 'frozen'],
    ['IMPORTING', { importing: true }, 'ae_mainnet', 'importing'],
    ['WRONG_NETWORK', {}, 'ae_uat', 'wrongNetwork'],
  ])('refuses %s before opening a signing prompt', async (_, changed, network, message) => {
    const { result } = renderSocialGraph();
    await waitFor(() => expect(result.current.relationship).toEqual(NOT_FOLLOWING));
    mockGetConfig.mockResolvedValue({
      contract_address: 'ct_social', network_id: 'ae_mainnet', frozen: false, importing: false, ...changed,
    });
    mockNetwork.mockResolvedValue(network);
    await act(async () => { await result.current.follow(); });
    expect(mockInitialize).not.toHaveBeenCalled();
    expect(notifications.notifySubmitted).not.toHaveBeenCalled();
    expect(result.current.error?.message).toContain(message);
  });

  it('does not sign or change counts when the precheck is unavailable', async () => {
    const { result } = renderSocialGraph();
    await waitFor(() => expect(result.current.relationship).toEqual(NOT_FOLLOWING));
    mockPrecheck.mockRejectedValue(new Error('503 unavailable'));
    await act(async () => { await result.current.follow(); });
    expect(mockInitialize).not.toHaveBeenCalled();
    expect(result.current.isFollowing).toBe(false);
    expect(result.current.error?.message).toContain('generic');
  });

  it('leaves the relationship unchanged and dismisses feedback when signing is cancelled', async () => {
    const { result } = renderSocialGraph();
    await waitFor(() => expect(result.current.relationship).toEqual(NOT_FOLLOWING));
    contractMethods.follow.mockRejectedValueOnce(new Error('Transaction cancelled'));
    await act(async () => { await result.current.follow(); });
    expect(result.current.isFollowing).toBe(false);
    expect(result.current.pendingAction).toBeNull();
    expect(result.current.error).toBeNull();
    expect(notifications.notifyConfirmed).not.toHaveBeenCalled();
    expect(notifications.notifyError).not.toHaveBeenCalled();
    expect(notifications.dismissNotification).toHaveBeenCalledOnce();
  });

  it('keeps count loading active through configuration and count retrieval', async () => {
    let resolveConfig!: (value: any) => void;
    let resolveCounts!: (value: any) => void;
    mockGetConfig.mockReturnValue(new Promise((resolve) => { resolveConfig = resolve; }));
    mockCounts.mockReturnValue(new Promise((resolve) => { resolveCounts = resolve; }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result, unmount } = renderHook(() => useSocialGraphCounts('ak_target'), { wrapper });
    expect(result.current.countsStatus).toBe('loading');
    expect(mockCounts).not.toHaveBeenCalled();
    await act(async () => resolveConfig({ contract_address: 'ct_social', network_id: 'ae_mainnet' }));
    await waitFor(() => expect(mockCounts).toHaveBeenCalledOnce());
    expect(result.current.countsStatus).toBe('loading');
    await act(async () => resolveCounts({ followers: 1, following: 0 }));
    await waitFor(() => expect(result.current.countsStatus).toBe('ready'));
    unmount(); client.clear();
  });

  it.each(['configuration', 'counts'])('exposes a %s failure and can retry without reloading the page', async (failure) => {
    mockCounts.mockResolvedValue({ followers: 1, following: 0 });
    const failing = failure === 'configuration' ? mockGetConfig : mockCounts;
    failing.mockRejectedValue(new Error('Temporarily unavailable'));
    const client = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result, unmount } = renderHook(() => useSocialGraphCounts('ak_target'), { wrapper });
    await waitFor(() => expect(result.current.countsStatus).toBe('error'));
    if (failure === 'configuration') expect(mockCounts).not.toHaveBeenCalled();
    mockGetConfig.mockResolvedValue({ contract_address: 'ct_social', network_id: 'ae_mainnet' });
    mockCounts.mockResolvedValue({ followers: 1, following: 0 });
    await act(async () => { await result.current.retryCounts(); });
    await waitFor(() => expect(result.current.countsStatus).toBe('ready'));
    expect(result.current.data?.followers).toBe(1);
    unmount(); client.clear();
  });

  it('uses projected counts without double incrementing a push that precedes wallet confirmation', async () => {
    mockCounts.mockResolvedValue({
      followers: 1, following: 0, stateHeight: 20, generation: '1',
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => ({ action: useSocialGraph('ak_target'), counts: useSocialGraphCounts('ak_target') }), { wrapper });
    await waitFor(() => expect(result.current.counts.data?.followers).toBe(1));
    await waitFor(() => expect(result.current.action.relationship).toEqual(NOT_FOLLOWING));
    mockCounts.mockResolvedValue({
      followers: 2, following: 0, stateHeight: 20, generation: '1',
    });
    await act(async () => { await result.current.counts.refetch(); });
    await act(async () => { await result.current.action.follow(); });
    await waitFor(() => expect(result.current.counts.data?.followers).toBe(2));
    expect(client.getQueryData(graphCountsKey('ak_target', 'ct_social'))).toEqual({
      followers: 2, following: 0, stateHeight: 20, generation: '1',
    });
    expect(mockCounts).toHaveBeenCalledWith('ak_target', 'ae_mainnet', 'ct_social');
  });
  it('updates the visible count and button when another session unfollows via the socket', async () => {
    mockCounts.mockResolvedValue({
      followers: 1, following: 0, stateHeight: 20, generation: '1',
    });
    mockGetRelationship.mockResolvedValue({ ...NOT_FOLLOWING, a_follows_b: true });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result, unmount } = renderHook(() => ({ action: useSocialGraph('ak_target'), counts: useSocialGraphCounts('ak_target') }), { wrapper });
    await waitFor(() => expect(result.current.counts.data?.followers).toBe(1));
    await waitFor(() => expect(result.current.action.isFollowing).toBe(true));
    mockCounts.mockResolvedValue({
      followers: 0, following: 0, stateHeight: 20, generation: '1',
    });
    mockGetRelationship.mockResolvedValue(NOT_FOLLOWING);
    act(() => socket.updates.forEach((fn) => fn({ network: 'ae_mainnet', contract: 'ct_social', accounts: ['ak_viewer', 'ak_target'] })));
    await waitFor(() => expect(result.current.counts.data?.followers).toBe(0));
    await waitFor(() => expect(result.current.action.isFollowing).toBe(false));
    expect(contractMethods.unfollow).not.toHaveBeenCalled();
    unmount(); client.clear();
  });
});
