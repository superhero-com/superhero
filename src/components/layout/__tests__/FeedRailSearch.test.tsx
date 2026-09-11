import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import FeedRailSearch from '../FeedRailSearch';

const mocks = vi.hoisted(() => ({
  search: vi.fn(),
  pushRecent: vi.fn(),
}));

vi.mock('@/features/trending/api/trendsSearch', () => ({
  EXPLORE_SEARCH_QUERY_KEY: 'q',
  FEED_RAIL_SEARCH_DEBOUNCE_MS: 40,
  fetchFeedRailSearchItems: mocks.search,
}));
vi.mock('@/hooks/useFeedRailRecentSearches', () => ({
  useFeedRailRecentSearches: () => ({
    items: [], pushRecent: mocks.pushRecent, removeRecent: vi.fn(), clearAll: vi.fn(),
  }),
}));
vi.mock('@/components/AddressAvatar', () => ({ default: () => null }));

const CurrentLocation = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname + location.search}</output>;
};

function renderSearch() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <FeedRailSearch />
        <CurrentLocation />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  const input = screen.getByRole('searchbox');
  fireEvent.focus(input);
  return input;
}

describe('FeedRailSearch while the query is debouncing', () => {
  beforeEach(() => {
    mocks.search.mockImplementation(async (query: string) => [{
      type: 'post', item: { id: query, content: `Result for ${query}` },
    }]);
  });

  it('submits the current input when Enter is pressed before the next search settles', async () => {
    const input = renderSearch();
    fireEvent.change(input, { target: { value: 'old' } });
    await screen.findByRole('button', { name: /Result for old/ });

    fireEvent.change(input, { target: { value: 'new query' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByTestId('location')).toHaveTextContent('/trends/tokens?q=new%20query');
    expect(mocks.pushRecent).toHaveBeenCalledWith({
      kind: 'query', id: 'q-new query', query: 'new query',
    });
  });

  it('hides stale hits immediately and uses the current query in the Explore link', async () => {
    const input = renderSearch();
    fireEvent.change(input, { target: { value: 'old' } });
    await screen.findByRole('button', { name: /Result for old/ });

    fireEvent.change(input, { target: { value: 'new query' } });

    expect(screen.queryByRole('button', { name: /Result for old/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/trends/tokens?q=new%20query');
    await screen.findByRole('button', { name: /Result for new query/ });
  });
});
