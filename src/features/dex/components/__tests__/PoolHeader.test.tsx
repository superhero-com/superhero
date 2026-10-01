import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  describe, expect, it, vi,
} from 'vitest';
import type { DexTokenDto, PairDto } from '@/api/generated';
import { PoolHeader } from '../PoolHeader';

const token: DexTokenDto = {
  address: 'ct_first_token',
  symbol: 'FIRST',
  name: 'First token',
  decimals: 18,
  pairs_count: 1,
  created_at: '2026-01-01T00:00:00Z',
  is_ae: false,
  listed: true,
  summary: null,
  price: {
    ae: 0, usd: 0, eur: 0, aud: 0, brl: 0, cad: 0, chf: 0, gbp: 0, xau: 0,
  },
};
const pair: PairDto = {
  address: 'ct_full_pool_contract_address',
  token0: token,
  token1: {
    ...token, address: 'ct_second_token', symbol: 'SECOND', name: 'Second token',
  },
  reserve0: '0',
  reserve1: '0',
  total_supply: '0',
  transactions_count: 0,
  created_at: token.created_at,
};
const setup = (overrides = {}) => render(
  <MemoryRouter>
    <PoolHeader address={pair.address} pairData={pair} onRetry={vi.fn()} {...overrides} />
  </MemoryRouter>,
);

describe('DeFi pool header', () => {
  it('preserves both actual token addresses and their order for every action', () => {
    setup();
    expect(screen.getByText(pair.address)).toHaveAttribute('dir', 'ltr');
    expect(screen.getByRole('heading', { name: 'FIRST / SECOND' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Add Liquidity' }))
      .toHaveAttribute('href', '/defi/pool?from=ct_first_token&to=ct_second_token');
    expect(screen.getByRole('link', { name: 'Swap tokens' }))
      .toHaveAttribute('href', '/defi/swap?from=ct_first_token&to=ct_second_token');
    expect(screen.getByRole('link', { name: 'FIRST View token' }))
      .toHaveAttribute('href', '/defi/explore/tokens/ct_first_token');
    expect(screen.getByRole('link', { name: 'SECOND View token' }))
      .toHaveAttribute('href', '/defi/explore/tokens/ct_second_token');
    expect(screen.getByRole('link', { name: 'Transactions' })).toHaveAttribute('href', '#pool-transactions');
  });
  it('does not expose incomplete swap or liquidity destinations while loading', () => {
    setup({ pairData: undefined, loading: true });
    expect(screen.getByRole('heading', { name: 'Loading pool details' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Swap tokens' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Add Liquidity' })).not.toBeInTheDocument();
  });
  it('allows retry after a failed request without showing stale pair actions', () => {
    const retry = vi.fn();
    setup({ failed: true, onRetry: retry });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.queryByRole('link', { name: 'Swap tokens' })).not.toBeInTheDocument();
  });
  it('copies the complete pool address and reports clipboard errors honestly', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const { unmount } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Copy pool address' }));
    expect(await screen.findByRole('button', { name: 'Address copied' })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(pair.address);
    unmount(); writeText.mockRejectedValue(new Error('Denied'));
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Copy pool address' }));
    expect(await screen.findByText('Could not copy. Select the address to copy it.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Address copied' })).not.toBeInTheDocument();
  });
});
