import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider, createStore } from 'jotai';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { changeLanguage } from '@/i18n';
import { SuperheroApi } from '@/api/backend';
import { SocialGraphConnectionsService } from '@/api/socialGraphConnections';
import { activeAccountAtom } from '@/atoms/accountAtoms';
import FeedList from '../FeedList';

vi.mock('@/api/backend', () => ({
  SuperheroApi: { listPosts: vi.fn(), listPopularPosts: vi.fn(), listTokens: vi.fn() },
}));
vi.mock('@/api/socialGraphConnections', () => ({
  SocialGraphConnectionsService: { listSocialGraphFollowing: vi.fn() },
}));
vi.mock('@/hooks/useLatestTransactions', () => ({
  useLatestTransactions: () => ({ latestTransactions: [] }),
}));
vi.mock('@/libs/WebSocketClient', () => ({ default: { subscribeToNewTokenSales: () => () => {} } }));
vi.mock('@/seo/Head', () => ({ Head: () => null }));
vi.mock('@/components/layout/Shell', () => ({ default: ({ children }: any) => children }));
vi.mock('@/components/layout/RightRail', () => ({ default: () => null }));
vi.mock('@/components/layout/MobileNetworkStats', () => ({ default: () => null }));
vi.mock('@/components/hero-banner/HeroBannerCarousel', () => ({ default: () => null }));
vi.mock('@/components/onboarding/RewardsOnboarding', () => ({ default: () => null }));
vi.mock('../../components/CreatePost', () => ({ default: () => null }));
vi.mock('../../components/SortControls', () => ({
  default: ({ sortBy, showFollowing }: any) => <span data-testid="sort">{`${sortBy}:${String(showFollowing)}`}</span>,
}));
vi.mock('../../components/ReplyToFeedItem', () => ({ default: ({ item }: any) => <p>{item.content}</p> }));
vi.mock('../../components/TokenCreatedActivityItem', () => ({ default: () => null }));
vi.mock('../../components/TradeActivityItem', () => ({ default: () => null }));
vi.mock('../../components/TrendingAssetsFeedItem', () => ({ default: () => null }));

const VIEWER = 'ak_viewer';
const page = (items: any[] = []) => ({ items, meta: { currentPage: 1, totalPages: 1 } });

function mount(account?: string) {
  const store = createStore();
  store.set(activeAccountAtom, account);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/?sortBy=following']}>
          <FeedList standalone={false} />
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>,
  );
}

beforeEach(async () => {
  vi.clearAllMocks();
  await changeLanguage('en');
  vi.mocked(SuperheroApi.listPosts).mockResolvedValue(page());
  vi.mocked(SuperheroApi.listPopularPosts).mockResolvedValue(page());
  vi.mocked(SuperheroApi.listTokens).mockResolvedValue(page());
});

describe('Home Following feed', () => {
  it('merges posts from followed accounts newest first', async () => {
    vi.mocked(SocialGraphConnectionsService.listSocialGraphFollowing).mockResolvedValue({
      items: [{ address: 'ak_a' }, { address: 'ak_b' }] as any,
      next_cursor: null,
    } as any);
    vi.mocked(SuperheroApi.listPosts).mockImplementation(async (params: any) => page(
      params?.accountAddress === 'ak_a'
        ? [{ id: 'a1', content: 'from a', created_at: '2026-10-01T10:00:00Z' }]
        : [{ id: 'b1', content: 'from b', created_at: '2026-10-01T11:00:00Z' }],
    ));
    mount(VIEWER);
    expect(screen.getAllByTestId('sort')[0]).toHaveTextContent('following:true');
    await screen.findByText('from a');
    const texts = screen.getAllByText(/^from /).map((el) => el.textContent);
    expect(texts).toEqual(['from b', 'from a']);
    expect(SocialGraphConnectionsService.listSocialGraphFollowing)
      .toHaveBeenCalledWith(expect.objectContaining({ address: VIEWER }));
    expect(SuperheroApi.listPosts).toHaveBeenCalledWith(expect.objectContaining({ accountAddress: 'ak_a' }));
    expect(SuperheroApi.listPosts).toHaveBeenCalledWith(expect.objectContaining({ accountAddress: 'ak_b' }));
  });

  it('shows the follow prompt when the wallet follows nobody', async () => {
    vi.mocked(SocialGraphConnectionsService.listSocialGraphFollowing)
      .mockResolvedValue({ items: [], next_cursor: null } as any);
    mount(VIEWER);
    await screen.findByText('Follow people to see their posts here.');
    expect(SuperheroApi.listPosts).not.toHaveBeenCalledWith(
      expect.objectContaining({ accountAddress: expect.anything() }),
    );
  });

  it('shows the no-posts state when followed accounts have not posted', async () => {
    vi.mocked(SocialGraphConnectionsService.listSocialGraphFollowing).mockResolvedValue({
      items: [{ address: 'ak_a' }] as any,
      next_cursor: null,
    } as any);
    mount(VIEWER);
    await screen.findByText("The accounts you follow haven't posted yet.");
  });

  it('falls back to the default feed without a connected wallet', async () => {
    mount(undefined);
    await waitFor(() => expect(screen.getAllByTestId('sort')[0]).toHaveTextContent('hot:false'));
    expect(SocialGraphConnectionsService.listSocialGraphFollowing).not.toHaveBeenCalled();
  });
});
