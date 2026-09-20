import React from 'react';
import {
  act, fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'jotai';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { changeLanguage } from '@/i18n';
import { SuperheroApi } from '@/api/backend';
import FeedList from '../FeedList';

vi.mock('@/api/backend', () => ({
  SuperheroApi: { listPosts: vi.fn(), listPopularPosts: vi.fn(), listTokens: vi.fn() },
}));
vi.mock('@/hooks/useLatestTransactions', () => ({
  useLatestTransactions: () => ({ latestTransactions: [{ id: 'trade', tx_type: 'buy' }] }),
}));
vi.mock('@/libs/WebSocketClient', () => ({ default: { subscribeToNewTokenSales: () => () => {} } }));
vi.mock('@/seo/Head', () => ({ Head: () => null }));
vi.mock('@/components/layout/Shell', () => ({ default: ({ children }: any) => children }));
vi.mock('@/components/layout/RightRail', () => ({ default: () => null }));
vi.mock('@/components/hero-banner/HeroBannerCarousel', () => ({ default: () => null }));
vi.mock('@/components/onboarding/RewardsOnboarding', () => ({ default: () => null }));
vi.mock('../../components/CreatePost', () => ({ default: () => null }));
vi.mock('../../components/SortControls', () => ({ default: () => null }));
vi.mock('../../components/ReplyToFeedItem', () => ({ default: ({ item }: any) => <p>{item.content}</p> }));
vi.mock('../../components/TokenCreatedActivityItem', () => ({ default: () => <p>Token activity</p> }));
vi.mock('../../components/TradeActivityItem', () => ({ default: () => <p>Trade activity</p> }));
vi.mock('../../components/TrendingAssetsFeedItem', () => ({ default: () => null }));

const page = (items: any[] = []) => ({ items, meta: { currentPage: 1, totalPages: 1 } });
const post = (id: string) => ({ id, content: id, created_at: '2026-09-20T12:00:00Z' });
function mount(sort = 'latest') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <Provider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[`/?sortBy=${sort}`]}>
          <FeedList standalone={false} />
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>,
  );
  return client;
}

beforeEach(async () => {
  vi.clearAllMocks();
  await changeLanguage('en');
  localStorage.clear();
  vi.mocked(SuperheroApi.listPosts).mockResolvedValue(page());
  vi.mocked(SuperheroApi.listPopularPosts).mockResolvedValue(page());
  vi.mocked(SuperheroApi.listTokens).mockResolvedValue(page([
    { name: 'Example', sale_address: 'ct_example', created_at: '2026-09-20T12:00:00Z' },
  ]));
});

describe('Home connected post languages', () => {
  it('shows the language empty state despite untagged activities, and All restores them', async () => {
    mount();
    await screen.findByRole('button', { name: 'Show all languages' });
    expect(screen.queryByText('Token activity')).not.toBeInTheDocument();
    expect(screen.queryByText('Trade activity')).not.toBeInTheDocument();
    expect(SuperheroApi.listPosts).toHaveBeenCalledWith(expect.objectContaining({ language: 'en' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show all languages' }));
    await screen.findByText('Token activity');
    expect(screen.getByText('Trade activity')).toBeInTheDocument();
    expect(SuperheroApi.listPosts).toHaveBeenLastCalledWith(
      expect.objectContaining({ language: undefined }),
    );
  });

  it('does not show an old language response when an in-flight request completes late', async () => {
    let finishEnglish!: (value: any) => void;
    vi.mocked(SuperheroApi.listPosts).mockImplementation(({ language } = {}) => (
      language === 'en' ? new Promise((resolve) => { finishEnglish = resolve; })
        : Promise.resolve(page([post('Arabic result')]))
    ));
    mount();
    await waitFor(() => expect(finishEnglish).toBeDefined());
    await act(() => changeLanguage('ar'));
    await screen.findByText('Arabic result');
    await act(async () => finishEnglish(page([post('English result')])));
    expect(screen.queryByText('English result')).not.toBeInTheDocument();
    expect(screen.getByText('Arabic result')).toBeInTheDocument();
  });

  it('waits for Hot backfill before announcing an empty language', async () => {
    let finishLatest!: (value: any) => void;
    vi.mocked(SuperheroApi.listPosts).mockImplementation(() => new Promise((resolve) => {
      finishLatest = resolve;
    }));
    mount('hot');
    await waitFor(() => expect(finishLatest).toBeDefined());
    expect(screen.getByRole('status', { name: 'Loading posts...' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show all languages' })).not.toBeInTheDocument();
    await act(async () => finishLatest(page()));
    await screen.findByRole('button', { name: 'Show all languages' });
    expect(SuperheroApi.listPopularPosts).toHaveBeenCalledWith(expect.objectContaining({ language: 'en' }));
  });

  it('offers retry and All for failed Hot backfill instead of reporting no posts', async () => {
    vi.mocked(SuperheroApi.listPosts).mockRejectedValue(new Error('Unavailable'));
    mount('hot');
    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show all languages' })).toBeInTheDocument();
    vi.mocked(SuperheroApi.listPosts).mockResolvedValue(page([post('Recovered post')]));
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText('Recovered post');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the selected language when loading the next Latest page', async () => {
    let intersect!: (entries: Array<{ isIntersecting: boolean }>) => void;
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: typeof intersect) { intersect = callback; }

      observe = vi.fn();

      disconnect = vi.fn();
    });
    vi.mocked(SuperheroApi.listPosts).mockImplementation(({ page: currentPage = 1 } = {}) => (
      Promise.resolve({
        items: [post(`Page ${currentPage}`)], meta: { currentPage, totalPages: 2 },
      })
    ));
    mount();
    await screen.findByText('Page 1');
    await waitFor(() => expect(intersect).toBeDefined());
    await act(async () => intersect([{ isIntersecting: true }]));
    await screen.findByText('Page 2');
    expect(SuperheroApi.listPosts).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, language: 'en' }),
    );
    expect(document.getElementById('feed-infinite-sentinel')).not.toBeInTheDocument();
  });

  it('renders a real empty state for an empty All languages feed', async () => {
    localStorage.setItem('postLanguageFilter', JSON.stringify({ ui: 'en', filter: 'all' }));
    mount('hot');
    await screen.findByText('No posts found.');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
