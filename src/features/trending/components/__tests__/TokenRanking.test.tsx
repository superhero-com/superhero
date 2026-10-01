import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent, render, screen, waitFor, within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import { SuperheroApi } from '@/api/backend';
import TokenRanking from '../TokenRanking/TokenRanking';
import {
  formatAmount, marketCap, rankingContext, tokenPrice, totalSupply,
} from '../TokenRanking/ranking';

vi.mock('@/api/backend', () => ({ SuperheroApi: { listTokenRankings: vi.fn() } }));
const token = (name: string, rank: number, cap: string): Partial<TokenDto> => ({
  sale_address: `ct_${name}`,
  name,
  symbol: name,
  rank,
  market_cap: `${cap}000000000000000000`,
  price: '0.000000004106',
  total_supply: '159597945000000',
  decimals: '6',
  holders_count: 1832,
});
const current = token('SUPERHERO', 7, '1500');
const items = [token('NOVA', 3, '2000'), token('ATLAS', 5, '1800'), current, token('ORBIT', 9, '1200'), token('WAVE', 12, '1000')];
const fetchRankings = vi.mocked(SuperheroApi.listTokenRankings);
const mount = (value: Partial<TokenDto> = current) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter><TokenRanking token={value} /></MemoryRouter>
      </QueryClientProvider>,
    ),
  };
};
beforeEach(() => { fetchRankings.mockReset(); });

describe('Ranking Race', () => {
  it('keeps AE prices, aetto market caps and token decimals distinct without rounding tiny prices to zero', () => {
    expect(formatAmount(tokenPrice(current))).toBe('0.000000004106');
    expect(formatAmount(marketCap(current))).toBe('1,500');
    expect(formatAmount(totalSupply(current), true)).toBe('159.6M');
    expect(formatAmount(totalSupply({ total_supply: '123000000000000000000' }))).toBe('123');
    expect(formatAmount(totalSupply({ total_supply: '123', decimals: '0' }))).toBe('123');
    expect(formatAmount(totalSupply({ total_supply: '123', decimals: 'invalid' }))).toBe('—');
    expect(formatAmount(marketCap({ market_cap_data: { ae: '1800000000000000000000' } as unknown as TokenDto['market_cap_data'] }))).toBe('1,800');
  });

  it('uses adjacent returned ranks for the cap gap, and shows rank one’s lead', () => {
    const mid = rankingContext(items, current.sale_address);
    expect(mid.neighbor?.rank).toBe(5);
    expect(formatAmount(mid.gap)).toBe('300');
    const leader = rankingContext([token('FIRST', 1, '3000'), token('SECOND', 4, '2000')], 'ct_FIRST');
    expect(leader.leading).toBe(true);
    expect(leader.neighbor?.rank).toBe(4);
    expect(formatAmount(leader.gap)).toBe('1,000');
    expect(rankingContext([current], current.sale_address).gap).toBeNull();
    expect(rankingContext([token('ATLAS', 5, '1400'), current], current.sale_address).gap).toBeNull();
  });

  it('renders all four metrics and links to the actual token route', async () => {
    fetchRankings.mockResolvedValue({ items });
    mount();
    const link = await screen.findByRole('link', { name: /SUPERHERO/ });
    expect(link).toHaveAttribute('aria-current', 'page');
    expect(link).toHaveAttribute('href', '/trends/tokens/SUPERHERO');
    expect(link).toHaveTextContent('0.000000004106');
    expect(link).toHaveTextContent('1.5K');
    expect(link).toHaveTextContent('Holders1,832');
    expect(link).toHaveTextContent('Total supply159.6M');
    expect(screen.getByText('Market-cap gap to #5')).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(5);
    expect(fetchRankings).toHaveBeenCalledWith(current.sale_address, { limit: 5, page: 1 });
    fireEvent.click(screen.getByRole('button', { name: 'How ranks work' }));
    expect(screen.getByText(/Rank numbers may have gaps/)).toBeVisible();
  });

  it('preserves zeros and labels missing metrics without manufacturing a comparison', async () => {
    const zero = {
      ...current, market_cap: '0', price: '0', total_supply: '0', holders_count: 0,
    };
    const missing = {
      ...token('UNKNOWN', 5, '2000'), market_cap: '', price: '', total_supply: '', holders_count: undefined,
    };
    fetchRankings.mockResolvedValue({ items: [missing, zero] });
    mount();
    const zeroLink = await screen.findByRole('link', { name: /SUPERHERO/ });
    expect(within(zeroLink).getAllByText('0')).toHaveLength(4);
    const unknown = screen.getByRole('link', { name: /UNKNOWN/ });
    expect(within(unknown).getAllByText('—')).toHaveLength(4);
    expect(screen.getByText('Comparison unavailable')).toBeInTheDocument();
  });

  it('shows loading, an actionable error, and recovers on retry', async () => {
    let rejectRequest: (reason: Error) => void = () => {};
    fetchRankings.mockReturnValueOnce(new Promise((_, reject) => { rejectRequest = reject; }));
    mount();
    expect(screen.getByRole('status', { name: 'Loading rankings' })).toBeInTheDocument();
    rejectRequest(new Error('Unavailable'));
    expect(await screen.findByText('Rankings unavailable')).toBeInTheDocument();
    fetchRankings.mockResolvedValue({ items });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('link', { name: /SUPERHERO/ })).toBeInTheDocument();
  });

  it('retains cached rankings and discloses a refresh failure', async () => {
    fetchRankings.mockResolvedValueOnce({ items });
    const { client } = mount();
    await screen.findByRole('link', { name: /SUPERHERO/ });
    fetchRankings.mockRejectedValue(new Error('Unavailable'));
    await client.invalidateQueries({ queryKey: ['TokensService.listTokenRankings', current.sale_address] });
    expect(await screen.findByRole('status')).toHaveTextContent('Showing the last available data');
    expect(screen.getByRole('link', { name: /SUPERHERO/ })).toBeInTheDocument();
  });

  it('does not invent rank one for an unranked token or request without a sale address', async () => {
    fetchRankings.mockResolvedValue({ items: [] });
    const view = mount();
    expect(await screen.findByText('Not ranked yet')).toBeInTheDocument();
    expect(screen.queryByText('This token’s rank')).not.toBeInTheDocument();
    view.unmount();
    fetchRankings.mockClear();
    mount({});
    await waitFor(() => expect(screen.getByText('Not ranked yet')).toBeInTheDocument());
    expect(fetchRankings).not.toHaveBeenCalled();
    expect(rankingContext([token('UNKNOWN', 2147483647, '0')], 'ct_UNKNOWN').current).toBeUndefined();
  });
});
