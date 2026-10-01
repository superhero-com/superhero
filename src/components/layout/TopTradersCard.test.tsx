import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  render, screen, fireEvent, waitFor,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { fetchLeaderboard } from '@/features/trending/api/leaderboard';
import TopTradersCard from './TopTradersCard';

vi.mock('@/features/trending/api/leaderboard', () => ({ fetchLeaderboard: vi.fn() }));
vi.mock('@/hooks/useChainName', () => ({ useChainName: () => ({ chainName: '' }) }));

const mountCard = () => render(
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } })}>
    <MemoryRouter><TopTradersCard /></MemoryRouter>
  </QueryClientProvider>,
);

beforeEach(() => { vi.resetAllMocks(); });

describe('TopTradersCard', () => {
  it('requests the top three all-time PnL traders and preserves missing and negative values', async () => {
    vi.mocked(fetchLeaderboard).mockResolvedValue({
      items: [
        { address: 'ak_first', chain_name: 'first.chain', pnl_usd: 1284 },
        { address: 'ak_second', chain_name: 'second.chain', pnl_usd: -42.5 },
        { address: 'ak_third', pnl_usd: undefined },
        { address: 'ak_fourth', chain_name: 'fourth.chain', pnl_usd: 0 },
      ],
      meta: { totalItems: 4, totalPages: 2, currentPage: 1 },
    });
    mountCard();
    expect(await screen.findByText('first.chain')).toBeVisible();
    expect(fetchLeaderboard).toHaveBeenCalledWith({
      timeframe: 'all', metric: 'pnl', page: 1, limit: 3, sortDir: 'DESC',
    });
    expect(screen.getByText('+$1,284')).toBeVisible();
    expect(screen.getByText('-$42.5')).toBeVisible();
    expect(screen.getByText('—')).toBeVisible();
    expect(screen.queryByText('fourth.chain')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /first.chain/ })).toHaveAttribute('href', '/users/ak_first');
    expect(screen.getByRole('link', { name: /ak_third/ })).toHaveAttribute('href', '/users/ak_third');
    expect(screen.getByRole('link', { name: 'View leaderboard' })).toHaveAttribute('href', '/trends/leaderboard');
  });

  it('keeps leaderboard navigation available after a failure and retries to an empty state', async () => {
    vi.mocked(fetchLeaderboard).mockRejectedValue(new Error('Unavailable'));
    mountCard();
    const retry = await screen.findByRole('button', { name: 'Retry' });
    expect(screen.getByRole('link', { name: 'View leaderboard' })).toBeVisible();
    vi.mocked(fetchLeaderboard).mockResolvedValue({
      items: [], meta: { totalItems: 0, totalPages: 1, currentPage: 1 },
    });
    fireEvent.click(retry);
    await waitFor(() => expect(screen.getByText('No top traders for this view yet')).toBeVisible());
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
