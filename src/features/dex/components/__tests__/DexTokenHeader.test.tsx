import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  describe, expect, it, vi,
} from 'vitest';
import type { DexTokenDto } from '@/api/generated';
import DexTokenHeader from '../DexTokenHeader';

vi.mock('@/hooks/useCurrencies', () => ({
  useCurrencies: () => ({ currentCurrencyCode: 'eur', currentCurrencyInfo: { symbol: '€' }, currentCurrencyRate: 0 }),
}));
const address = 'ct_KeTvHnhU85vuuQMMZocaiYkPL9tkoavDRT3Jsy47LK2YqLHYb';
const price = {
  ae: 0.003, usd: 0, eur: 0.00002, aud: 0, brl: 0, cad: 0, chf: 0, gbp: 0, xau: 0,
};
const period = { percentage: '0', volume: price };
const token: DexTokenDto = {
  address,
  symbol: 'WTT',
  name: 'WeTrue Token',
  pairs_count: 5,
  decimals: 18,
  created_at: '2026-01-01T00:00:00Z',
  is_ae: false,
  listed: true,
  price,
  summary: { address, total_volume: price, change: { '24h': period, '7d': period, '30d': period } },
};
const setup = (overrides = {}) => render(<MemoryRouter><DexTokenHeader address={address} token={token} onRetry={vi.fn()} {...overrides} /></MemoryRouter>);

describe('DeFi token header', () => {
  it('shows the full contract and keeps every existing action destination', () => {
    setup();
    expect(screen.getByText(address)).toHaveAttribute('dir', 'ltr');
    expect(screen.getByRole('heading', { name: 'WTT' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Swap' })).toHaveAttribute('href', `/defi/swap?from=AE&to=${address}`);
    expect(screen.getByRole('link', { name: 'Add Liquidity' })).toHaveAttribute('href', `/defi/pool?from=AE&to=${address}`);
    expect(screen.getByRole('link', { name: 'Pools 5' })).toHaveAttribute('href', `/defi/explore/pools?tokenAddress=${address}`);
    expect(screen.getByRole('link', { name: 'Transactions' })).toHaveAttribute('href', `/defi/explore/transactions?tokenAddress=${address}`);
  });
  it('shows zero change and the selected fiat currency', () => {
    setup();
    expect(screen.getByText(/\+0.00%/)).toHaveTextContent('24h');
    expect(screen.getByText('€')).toBeInTheDocument();
  });
  it('distinguishes unavailable prices from zero and does not invent missing fiat or change', () => {
    const { unmount } = setup({ token: { ...token, price: { ae: null }, summary: null } });
    expect(screen.getByText('AE price unavailable')).toBeInTheDocument();
    expect(screen.queryByText('24h')).not.toBeInTheDocument();
    unmount();
    setup({ token: { ...token, price: { ae: 0 }, summary: null } });
    expect(screen.queryByText('AE price unavailable')).not.toBeInTheDocument();
    expect(screen.queryByText('€')).not.toBeInTheDocument();
  });
  it('reports clipboard failure without reporting success', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Copy contract address' }));
    expect(await screen.findByText('Could not copy. Select the address to copy it.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Address copied' })).not.toBeInTheDocument();
  });
  it('provides retry on failure and no token actions during loading', () => {
    const retry = vi.fn();
    const { unmount } = setup({ failed: true, onRetry: retry });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
    unmount(); setup({ loading: true });
    expect(screen.queryByRole('link', { name: 'Swap' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
});
