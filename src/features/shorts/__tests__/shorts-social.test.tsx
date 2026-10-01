import {
  act, fireEvent, render, renderHook, screen, waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { type ReactNode } from 'react';
import { relationshipKey } from '@/hooks/useSocialGraph';
import { ShortsFollow } from '../shorts-follow';
import { useShortsSocial } from '../use-shorts-social';
import type { Short } from '../types';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  connect: vi.fn(),
  follow: vi.fn(),
  unfollow: vi.fn(),
  policy: {
    data: { contract_address: 'ct_social' }, isError: false, isPending: false, refetch: vi.fn(),
  },
  graph: {
    viewer: 'ak_viewer',
    isSelf: false,
    isReady: true,
    isFollowing: false,
    hasBlocked: false,
    blockedByThem: false,
    configLoading: false,
    relationshipLoading: false,
    pendingAction: null as string | null,
    config: { contract_address: 'ct_social' },
    error: null,
  },
}));
vi.mock('@/hooks/useSocialGraph', () => ({
  useSocialGraph: () => ({ ...mocks.graph, follow: mocks.follow, unfollow: mocks.unfollow }),
  useSocialGraphConfig: () => mocks.policy,
  socialGraphScope: () => ['ae_uat', 'test-api'],
  relationshipKey: (from: string, to: string, contract: string) => ['SocialGraphService.relationship', 'ae_uat', 'test-api', contract, from, to],
}));
vi.mock('@/api/generated', () => ({ SocialGraphService: { getSocialGraphRelationship: mocks.request } }));
vi.mock('@/hooks/useWalletConnect', () => ({ useWalletConnect: () => ({ connectWallet: mocks.connect }) }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => ({
      'socialGraph.follow': 'Follow', 'socialGraph.unfollow': 'Unfollow', 'socialGraph.following': 'Following', 'socialGraph.connectToFollow': 'Connect wallet to follow',
    }[key] || key),
  }),
}));
const wrapperFor = (client: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>
  );
  return Wrapper;
};
const clips = [{ creator: 'ak_one' }, { creator: 'ak_one' }, { creator: 'ak_two' }] as Short[];
beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(mocks.graph, {
    viewer: 'ak_viewer', isSelf: false, isReady: true, isFollowing: false, configLoading: false, relationshipLoading: false, pendingAction: null,
  });
  Object.assign(mocks.policy, { isError: false, isPending: false });
  mocks.request.mockImplementation(async () => ({ a_follows_b: false, a_blocked_b: false, b_blocked_a: false }));
});

describe('Shorts contract follows', () => {
  it('shares confirmed profile relationships and immediately isolates another wallet', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result, rerender } = renderHook(({ viewer }) => useShortsSocial(clips, viewer), {
      wrapper: wrapperFor(client), initialProps: { viewer: 'ak_viewer' },
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mocks.request).toHaveBeenCalledTimes(2);
    act(() => client.setQueryData(relationshipKey('ak_viewer', 'ak_one', 'ct_social'), { a_follows_b: true }));
    await waitFor(() => expect(result.current.followed).toEqual(['ak_one']));
    rerender({ viewer: 'ak_other' });
    expect(result.current.followed).toEqual([]);
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mocks.request).toHaveBeenCalledWith({ from: 'ak_other', to: 'ak_one' });
    rerender({ viewer: '' });
    expect(result.current.status).toBe('disconnected');
    expect(result.current.followed).toEqual([]);
    client.clear();
  });
  it('does not fabricate follows when the social API is unavailable', () => {
    mocks.policy.isError = true;
    const client = new QueryClient();
    const { result } = renderHook(() => useShortsSocial([], 'ak_viewer'), { wrapper: wrapperFor(client) });
    expect(result.current.status).toBe('error');
    expect(result.current.followed).toEqual([]);
    client.clear();
  });
  it('uses the shared follow/unfollow actions and releases the modal for the wallet', async () => {
    const client = new QueryClient(); const pending = vi.fn();
    const wrapper = wrapperFor(client);
    const { rerender } = render(<ShortsFollow address="ak_one" onWalletPending={pending} />, { wrapper });
    fireEvent.click(screen.getByRole('button', { name: 'Follow' }));
    await waitFor(() => expect(mocks.follow).toHaveBeenCalledOnce());
    mocks.graph.pendingAction = 'follow';
    rerender(<ShortsFollow address="ak_one" onWalletPending={pending} />);
    expect(pending).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole('button', { name: 'Follow' })).toBeDisabled();
    mocks.graph.pendingAction = null; mocks.graph.isFollowing = true;
    rerender(<ShortsFollow address="ak_one" onWalletPending={pending} />);
    expect(pending).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByRole('button', { name: 'Unfollow' }));
    await waitFor(() => expect(mocks.unfollow).toHaveBeenCalledOnce());
  });
  it('connects without automatically following, hides self-follow and offers retry on failure', async () => {
    mocks.graph.viewer = ''; mocks.connect.mockResolvedValue('ak_viewer');
    const client = new QueryClient(); const pending = vi.fn();
    const { rerender } = render(<ShortsFollow address="ak_one" onWalletPending={pending} />, { wrapper: wrapperFor(client) });
    fireEvent.click(screen.getByRole('button', { name: 'Connect wallet to follow' }));
    await waitFor(() => expect(mocks.connect).toHaveBeenCalledOnce());
    expect(mocks.follow).not.toHaveBeenCalled();
    mocks.graph.viewer = 'ak_one'; mocks.graph.isSelf = true;
    rerender(<ShortsFollow address="ak_one" onWalletPending={pending} />);
    expect(screen.queryByRole('button')).toBeNull();
    mocks.graph.isSelf = false; mocks.graph.isReady = false;
    rerender(<ShortsFollow address="ak_one" onWalletPending={pending} />);
    expect(screen.getByText('Follow status is unavailable.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeEnabled();
  });
});
