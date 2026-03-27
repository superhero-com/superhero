/* eslint-disable object-curly-newline */
import React from 'react';
import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import TokenList from '../TokenList';

const searchApiMocks = vi.hoisted(() => ({
  fetchTrendSearchPreview: vi.fn(),
  fetchTrendSearchSection: vi.fn(),
  fetchPopularPosts: vi.fn(),
  fetchTopTraders: vi.fn(),
  fetchTrendingTokens: vi.fn(),
}));

const tokenServiceMocks = vi.hoisted(() => ({
  listAll: vi.fn(),
}));

vi.mock('../../api/trendsSearch', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../../api/trendsSearch')>();
  return {
    ...mod,
    fetchTrendSearchPreview: (...args: any[]) => searchApiMocks.fetchTrendSearchPreview(...args),
    fetchTrendSearchSection: (...args: any[]) => searchApiMocks.fetchTrendSearchSection(...args),
    fetchPopularPosts: (...args: any[]) => searchApiMocks.fetchPopularPosts(...args),
    fetchTopTraders: (...args: any[]) => searchApiMocks.fetchTopTraders(...args),
    fetchTrendingTokens: (...args: any[]) => searchApiMocks.fetchTrendingTokens(...args),
  };
});

vi.mock('../../../../api/generated', () => ({
  TokensService: {
    listAll: (...args: any[]) => tokenServiceMocks.listAll(...args),
  },
}));

vi.mock('../../../../seo/Head', () => ({
  Head: () => null,
}));

vi.mock('../../../../components/Spinner', () => ({
  default: () => <span data-testid="spinner">spinner</span>,
}));

vi.mock('../../../../components/Trendminer/LatestTransactionsCarousel', () => ({
  default: () => <div data-testid="latest-carousel" />,
}));

vi.mock('../../components/TokenListTable', () => ({
  default: ({ pages }: any) => (
    <div data-testid="token-list-table">
      {(pages?.[0]?.items ?? []).map((item: any) => (
        <span key={item.address}>{item.name}</span>
      ))}
    </div>
  ),
}));

vi.mock('../../../social/components/ReplyToFeedItem', () => ({
  default: ({ item }: any) => (
    <div data-testid="reply-to-feed-item">{item.content}</div>
  ),
}));

function renderView() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <TokenList />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('TokenList search experience', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();

    tokenServiceMocks.listAll.mockResolvedValue({
      items: [{ address: 'ct_default', sale_address: 'ct_default_sale', name: 'DEFAULT' }],
      meta: { currentPage: 1, totalPages: 1 },
    });

    searchApiMocks.fetchTopTraders.mockResolvedValue({
      items: [{ address: 'ak_trader', chain_name: 'alpha.chain', pnl_usd: 1200 }],
      meta: { totalItems: 1, totalPages: 1, currentPage: 1 },
    });

    searchApiMocks.fetchTrendingTokens.mockResolvedValue({
      items: [{ address: 'ct_trending', sale_address: 'ct_trending_sale', name: 'TRENDING' }],
      meta: { totalItems: 1, totalPages: 1, currentPage: 1 },
    });

    searchApiMocks.fetchPopularPosts.mockResolvedValue({
      items: [{
        id: 'post_1_v3',
        sender_address: 'ak_author',
        content: 'Popular post',
        media: [],
        topics: [],
        total_comments: 2,
        tx_hash: '',
        tx_args: [],
        contract_address: '',
        type: 'post',
        created_at: '2026-03-27T12:00:00.000Z',
      }],
      meta: { totalItems: 1, totalPages: 1, currentPage: 1 },
    });

    searchApiMocks.fetchTrendSearchPreview.mockResolvedValue({
      tokens: {
        items: [
          { address: 'ct_1', sale_address: 'ct_sale_1', name: 'ALPHA', symbol: 'ALPHA', price: '1', holders_count: 5, market_cap: '10' },
          { address: 'ct_2', sale_address: 'ct_sale_2', name: 'BETA', symbol: 'BETA', price: '2', holders_count: 6, market_cap: '11' },
          { address: 'ct_3', sale_address: 'ct_sale_3', name: 'GAMMA', symbol: 'GAMMA', price: '3', holders_count: 7, market_cap: '12' },
        ],
        meta: { totalItems: 4, totalPages: 2, currentPage: 1 },
      },
      users: {
        items: [{ address: 'ak_user', chain_name: 'user.chain', total_volume: '10', total_tx_count: 3, total_created_tokens: 1 }],
        meta: { totalItems: 1, totalPages: 1, currentPage: 1 },
      },
      posts: {
        items: [{
          id: 'post_search_v3',
          sender_address: 'ak_post',
          content: 'Searchable post',
          media: [],
          topics: [],
          total_comments: 1,
          tx_hash: '',
          tx_args: [],
          contract_address: '',
          type: 'post',
          created_at: '2026-03-27T12:00:00.000Z',
        }],
        meta: { totalItems: 1, totalPages: 1, currentPage: 1 },
      },
    });

    searchApiMocks.fetchTrendSearchSection.mockResolvedValue({
      items: [
        { address: 'ct_1', sale_address: 'ct_sale_1', name: 'ALPHA', symbol: 'ALPHA', price: '1', holders_count: 5, market_cap: '10' },
        { address: 'ct_2', sale_address: 'ct_sale_2', name: 'BETA', symbol: 'BETA', price: '2', holders_count: 6, market_cap: '11' },
        { address: 'ct_3', sale_address: 'ct_sale_3', name: 'GAMMA', symbol: 'GAMMA', price: '3', holders_count: 7, market_cap: '12' },
        { address: 'ct_4', sale_address: 'ct_sale_4', name: 'DELTA', symbol: 'DELTA', price: '4', holders_count: 8, market_cap: '13' },
      ],
      meta: { totalItems: 4, totalPages: 1, currentPage: 1 },
    });

    Object.defineProperty(window, 'IntersectionObserver', {
      writable: true,
      value: function IntersectionObserverMock() {
        return {
          observe() {},
          disconnect() {},
        };
      },
    });
  });

  it('shows default tab content and switches to users and posts tabs', async () => {
    renderView();

    await waitFor(() => {
      expect(screen.getByTestId('token-list-table')).toBeInTheDocument();
    });
    expect(screen.getByText('Tokenized Trends')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tokenize Trend' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Users' }));
    await waitFor(() => {
      expect(screen.getByText('alpha.chain')).toBeInTheDocument();
    });
    expect(screen.getByText('Top Traders')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Posts' }));
    await waitFor(() => {
      expect(screen.getByText('Popular post')).toBeInTheDocument();
    });
    expect(screen.getByText('Popular Posts')).toBeInTheDocument();
  });

  it('renders search sections and expands tokens with view all', async () => {
    renderView();

    fireEvent.change(screen.getByLabelText('Search tokens, users and posts'), {
      target: { value: 'hello' },
    });

    await waitFor(() => {
      expect(searchApiMocks.fetchTrendSearchPreview).toHaveBeenCalledWith('hello');
    }, { timeout: 2000 });

    expect(screen.queryByRole('button', { name: 'Users' })).not.toBeInTheDocument();
    expect(screen.getByText('ALPHA')).toBeInTheDocument();
    expect(screen.getByText('user.chain')).toBeInTheDocument();
    expect(screen.getByText('Searchable post')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View all' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'View all' }));

    await waitFor(() => {
      expect(searchApiMocks.fetchTrendSearchSection).toHaveBeenCalledWith('tokens', 'hello');
    });

    await waitFor(() => {
      expect(screen.getByText('DELTA')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument();
  });

  it('shows fallback view all buttons and opens the full topic when nothing is found', async () => {
    searchApiMocks.fetchTrendSearchPreview.mockResolvedValueOnce({
      tokens: {
        items: [],
        meta: { totalItems: 0, totalPages: 0, currentPage: 1 },
      },
      users: {
        items: [],
        meta: { totalItems: 0, totalPages: 0, currentPage: 1 },
      },
      posts: {
        items: [],
        meta: { totalItems: 0, totalPages: 0, currentPage: 1 },
      },
    });

    renderView();

    fireEvent.change(screen.getByLabelText('Search tokens, users and posts'), {
      target: { value: 'missing' },
    });

    await waitFor(() => {
      expect(searchApiMocks.fetchTrendSearchPreview).toHaveBeenCalledWith('missing');
    }, { timeout: 2000 });

    await waitFor(() => {
      expect(searchApiMocks.fetchTrendingTokens).toHaveBeenCalled();
      expect(searchApiMocks.fetchTopTraders).toHaveBeenCalled();
      expect(searchApiMocks.fetchPopularPosts).toHaveBeenCalled();
    });

    const viewAllButtons = await screen.findAllByRole('button', { name: 'View all' });
    expect(viewAllButtons).toHaveLength(3);

    fireEvent.click(viewAllButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('Top Traders')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Users' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tokens' })).toBeInTheDocument();
  });

  it('shows error panel when search preview fails', async () => {
    searchApiMocks.fetchTrendSearchPreview.mockRejectedValue(
      new Error('Network error'),
    );

    renderView();

    fireEvent.change(screen.getByLabelText('Search tokens, users and posts'), {
      target: { value: 'fail' },
    });

    await waitFor(() => {
      expect(screen.getByText('Unable to load search results right now. Please try again.')).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
