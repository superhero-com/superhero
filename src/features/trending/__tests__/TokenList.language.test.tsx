import React from 'react';
import {
  act, fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'jotai';
import { MemoryRouter, useLocation } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import i18n, { changeLanguage } from '@/i18n';
import { usePostLanguageFilter } from '@/hooks/usePostLanguageFilter';
import { TokensService } from '@/api/generated';
import { fetchPopularPosts } from '../api/trendsSearch';
import TokenList from '../views/TokenList';

vi.mock('@/hooks/useCommunityFactory', () => ({
  useEnsureFactorySchemaLoaded: () => [
    { name: 'WORDS' }, { name: 'CHINESE' }, { name: 'RUSSIAN' }, { name: 'ARABIC' },
  ],
}));
vi.mock('@/seo/Head', () => ({ Head: () => null }));
vi.mock('@/api/generated', () => ({
  TokensService: { listAll: vi.fn() },
}));
vi.mock('@/components/Trendminer/LatestTransactionsCarousel', () => ({
  default: () => null,
}));
vi.mock('../components/TokenListTable', () => ({ default: () => null }));
vi.mock('../components/ExploreTokenMarkets', () => ({ default: () => null }));
vi.mock('../components/TrendSearchExploreResultLists', () => ({
  PostResultsList: ({ items }: any) => (
    <>{items.map((item: any) => <p key={item.id}>{item.content}</p>)}</>
  ),
  TokenResultsList: () => null,
  UserResultsList: () => null,
}));
vi.mock('../api/trendsSearch', async (importOriginal) => ({
  ...await importOriginal<typeof import('../api/trendsSearch')>(),
  fetchPopularPosts: vi.fn(),
}));

const empty = { items: [], meta: { currentPage: 1, totalPages: 1, totalItems: 0 } };
const HomePreference = () => {
  const { filter } = usePostLanguageFilter();
  return <output aria-label="Home preference">{filter}</output>;
};
const CurrentSearch = () => <output aria-label="Current search">{useLocation().search}</output>;
function mount({ posts = true, entry = '/trends/tokens' } = {}) {
  render(
    <Provider>
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <MemoryRouter initialEntries={[entry]}>
          <CurrentSearch />
          <HomePreference />
          <TokenList />
        </MemoryRouter>
      </QueryClientProvider>
    </Provider>,
  );
  if (posts) fireEvent.click(screen.getByRole('button', { name: 'Posts' }));
}

beforeEach(async () => {
  vi.clearAllMocks();
  await changeLanguage('en');
  localStorage.clear();
  vi.stubGlobal('IntersectionObserver', class {
    observe = vi.fn();

    unobserve = vi.fn();

    disconnect = vi.fn();
  });
  vi.mocked(fetchPopularPosts).mockResolvedValue(empty);
  vi.mocked(TokensService.listAll).mockResolvedValue(empty as any);
});

describe('Explore Posts language states', () => {
  it('shows a pending state before an empty result and shares All with Home', async () => {
    let finish!: (value: any) => void;
    vi.mocked(fetchPopularPosts).mockImplementation(() => new Promise((resolve) => {
      finish = resolve;
    }));
    mount();
    await waitFor(() => expect(fetchPopularPosts).toHaveBeenCalledWith(12, 'en'));
    expect(screen.queryByRole('button', { name: 'Show all languages' })).not.toBeInTheDocument();
    await act(async () => finish(empty));
    await screen.findByRole('button', { name: 'Show all languages' });
    vi.mocked(fetchPopularPosts).mockResolvedValue(empty);
    fireEvent.click(screen.getByRole('button', { name: 'Show all languages' }));
    expect(screen.getByRole('status', { name: 'Home preference' })).toHaveTextContent('all');
    await waitFor(() => expect(fetchPopularPosts).toHaveBeenLastCalledWith(12, undefined));
    expect(i18n.language).toBe('en');
  });

  it('keeps failures distinct from empty results and retries successfully', async () => {
    vi.mocked(fetchPopularPosts).mockRejectedValue(new Error('Unavailable'));
    mount();
    await screen.findByRole('alert');
    expect(screen.queryByText(/No posts in/)).not.toBeInTheDocument();
    vi.mocked(fetchPopularPosts).mockResolvedValue({ ...empty, items: [{ id: 'p1', content: 'Recovered post' }] } as any);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText('Recovered post');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('Explore collection follows the global language', () => {
  it.each([
    ['en', 'WORDS', 'English'], ['ru', 'RUSSIAN', 'Russian'],
    ['zh', 'CHINESE', 'Chinese'], ['ar', 'ARABIC', 'Arabic'],
  ] as const)('starts with the %s collection on direct navigation', async (language, collection, label) => {
    await changeLanguage(language);
    mount({ posts: false });
    await waitFor(() => expect(TokensService.listAll).toHaveBeenCalledWith(
      expect.objectContaining({ collection, page: 1 }),
    ));
    expect(screen.getByRole('combobox', {
      name: i18n.t('tokenListTable.collection', { ns: 'trending' }),
    })).toHaveTextContent(label);
  });

  it('honors an explicit collection link until the global language changes', async () => {
    mount({ posts: false, entry: '/trends/tokens?collection=CHINESE&source=banner' });
    await waitFor(() => expect(TokensService.listAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ collection: 'CHINESE' }),
    ));
    await act(() => changeLanguage('ru'));
    await waitFor(() => expect(TokensService.listAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ collection: 'RUSSIAN', page: 1 }),
    ));
    expect(screen.getByRole('combobox', { name: 'Collection' })).toHaveTextContent('Russian');
    expect(screen.getByRole('status', { name: 'Current search' })).toHaveTextContent('?source=banner');
    await act(() => changeLanguage('en'));
    await waitFor(() => expect(TokensService.listAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ collection: 'WORDS' }),
    ));
  });

  it('retains explicit All and replaces it when the interface language changes', async () => {
    mount({ posts: false, entry: '/trends/tokens?collection=all' });
    await waitFor(() => expect(TokensService.listAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ collection: 'all' }),
    ));
    expect(screen.getByRole('combobox', { name: 'Collection' })).toHaveTextContent('All');
    await act(() => changeLanguage('ar'));
    await waitFor(() => expect(TokensService.listAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ collection: 'ARABIC' }),
    ));
    expect(screen.getByRole('status', { name: 'Current search' })).toBeEmptyDOMElement();
  });
});
