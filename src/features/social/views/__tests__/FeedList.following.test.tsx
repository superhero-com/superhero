import React from 'react';
import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
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

function mount(account?: string, url = '/?sortBy=following') {
  const store = createStore();
  store.set(activeAccountAtom, account);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <Provider store={store}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[url]}>
          <FeedList standalone={false} />
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>,
  );
}

const followSomeone = () => vi.mocked(SocialGraphConnectionsService.listSocialGraphFollowing)
  .mockResolvedValue({ items: [{ address: 'ak_a' }], next_cursor: null } as any);

beforeEach(async () => {
  vi.clearAllMocks();
  // The post-language filter persists here, and defaults to the UI language.
  localStorage.clear();
  await changeLanguage('en');
  vi.mocked(SuperheroApi.listPosts).mockResolvedValue(page());
  vi.mocked(SuperheroApi.listPopularPosts).mockResolvedValue(page());
  vi.mocked(SuperheroApi.listTokens).mockResolvedValue(page());
});

describe('Home Following feed', () => {
  it('loads posts from followed accounts in a single request', async () => {
    vi.mocked(SuperheroApi.listPosts).mockImplementation(async (params: any) => page(
      params?.followedBy === VIEWER
        ? [
          { id: 'b1', content: 'from b', created_at: '2026-10-01T11:00:00Z' },
          { id: 'a1', content: 'from a', created_at: '2026-10-01T10:00:00Z' },
        ]
        : [],
    ));
    mount(VIEWER);
    expect(screen.getAllByTestId('sort')[0]).toHaveTextContent('following:true');
    await screen.findByText('from a');
    const texts = screen.getAllByText(/^from /).map((el) => el.textContent);
    expect(texts).toEqual(['from b', 'from a']);
    const followingCalls = vi.mocked(SuperheroApi.listPosts).mock.calls
      .filter(([params]) => params?.followedBy);
    expect(followingCalls).toEqual([[expect.objectContaining({
      followedBy: VIEWER, page: 1, orderBy: 'created_at', orderDirection: 'DESC',
    })]]);
    expect(SocialGraphConnectionsService.listSocialGraphFollowing).not.toHaveBeenCalled();
  });

  it('shows the follow prompt when the wallet follows nobody', async () => {
    vi.mocked(SocialGraphConnectionsService.listSocialGraphFollowing)
      .mockResolvedValue({ items: [], next_cursor: null } as any);
    mount(VIEWER);
    await screen.findByText('Follow people to see their posts here.');
    expect(SocialGraphConnectionsService.listSocialGraphFollowing)
      .toHaveBeenCalledWith({ address: VIEWER, limit: 1 });
  });

  it('shows the no-posts state only once no language filter can explain it', async () => {
    followSomeone();
    mount(VIEWER);
    fireEvent.click(await screen.findByRole('button', { name: 'Show all languages' }));
    await screen.findByText("The accounts you follow haven't posted yet.");
    expect(SuperheroApi.listPosts).toHaveBeenCalledWith(
      expect.objectContaining({ followedBy: VIEWER, language: undefined }),
    );
  });

  it('reaches followed posts in other languages from an empty filtered feed', async () => {
    followSomeone();
    vi.mocked(SuperheroApi.listPosts).mockImplementation(async (params: any) => page(
      params?.followedBy === VIEWER && !params.language
        ? [{ id: 'f1', content: 'bonjour', created_at: '2026-10-01T10:00:00Z' }]
        : [],
    ));
    mount(VIEWER);
    const showAll = await screen.findByRole('button', { name: 'Show all languages' });
    expect(SuperheroApi.listPosts).toHaveBeenCalledWith(
      expect.objectContaining({ followedBy: VIEWER, language: 'en' }),
    );
    fireEvent.click(showAll);
    await screen.findByText('bonjour');
  });

  it('falls back to the default feed without a connected wallet', async () => {
    mount(undefined);
    await waitFor(() => expect(screen.getAllByTestId('sort')[0]).toHaveTextContent('hot:false'));
    expect(SocialGraphConnectionsService.listSocialGraphFollowing).not.toHaveBeenCalled();
    expect(SuperheroApi.listPosts).not.toHaveBeenCalledWith(
      expect.objectContaining({ followedBy: expect.anything() }),
    );
  });

  it('shows the newest posts for a sort the app no longer has', async () => {
    vi.mocked(SuperheroApi.listPosts).mockResolvedValue(page([
      { id: 'n1', content: 'newest post', created_at: '2026-10-01T10:00:00Z' },
    ]));
    // The previous app linked its "highest rated" feed this way.
    mount(undefined, '/?sortBy=highest');
    await screen.findByText('newest post');
    expect(screen.getAllByTestId('sort')[0]).toHaveTextContent('latest:false');
    expect(SuperheroApi.listPopularPosts).not.toHaveBeenCalled();
  });
});
