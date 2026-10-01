import { fireEvent, render, screen } from '@testing-library/react';
import {
  describe, expect, it, vi,
} from 'vitest';
import type { DexTokenDto, PairDto, PairSummaryDto } from '@/api/generated';
import { PoolStatsOverview } from '../PoolStatsOverview';

const price = (ae: number) => ({
  ae, usd: 0, eur: 0, aud: 0, brl: 0, cad: 0, chf: 0, gbp: 0, xau: 0,
});
const token: DexTokenDto = {
  address: 'ct_first',
  symbol: 'FIRST',
  name: 'First token',
  decimals: 6,
  pairs_count: 1,
  created_at: '',
  is_ae: false,
  listed: true,
  summary: null,
  price: price(0),
};
const pair: PairDto = {
  address: 'ct_pool',
  token0: token,
  token1: {
    ...token, address: 'ct_second', symbol: 'SECOND', name: 'Second token', decimals: 18,
  },
  reserve0: '2500000',
  reserve1: '10000000000000000000',
  total_supply: '5000000000000000000',
  transactions_count: 1,
  created_at: '',
};
const period = (volume: number, percentage: string) => ({ volume: price(volume), price_change: { percentage, value: '0' } });
const summary: PairSummaryDto = {
  address: pair.address,
  volume_token: token.address,
  token_position: '0',
  total_volume: price(40606.15),
  change: { '24h': period(213.48, '2.84'), '7d': period(1862.75, '-1.26'), '30d': period(0, '0') },
};
const setup = (overrides = {}) => render(
  <PoolStatsOverview pairData={pair} pairSummary={summary} onRetry={vi.fn()} {...overrides} />,
);

describe('Pool activity and balances', () => {
  it('keeps API volume in human AE and updates only period-dependent metrics', () => {
    setup();
    expect(screen.getByText('213.48')).toBeInTheDocument();
    expect(screen.getByText('40,606.15')).toBeInTheDocument();
    expect(screen.getByText('+2.84%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '7d' }));
    expect(screen.getByText('1,862.75')).toBeInTheDocument();
    expect(screen.getByText('-1.26%')).toBeInTheDocument();
    expect(screen.getByText('40,606.15')).toBeInTheDocument();
    expect(screen.queryByText('213.48')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '7d' })).toHaveAttribute('aria-pressed', 'true');
  });
  it('normalizes mixed token decimals and LP supply before computing both rates', () => {
    setup();
    expect(screen.getByText('2.50')).toBeInTheDocument();
    expect(screen.getByText('10.00')).toBeInTheDocument();
    expect(screen.getByText('5.00')).toBeInTheDocument();
    expect(screen.queryByText('1 FIRST = 4.00 SECOND')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Exchange rate' }));
    expect(screen.getByText('1 FIRST = 4.00 SECOND')).toBeInTheDocument();
    expect(screen.getByText('1 SECOND = 0.25 FIRST')).toBeInTheDocument();
  });
  it('uses the summary volume token for the price-change direction for either token order', () => {
    const { rerender } = setup();
    expect(screen.getByText('FIRST priced in SECOND')).toBeInTheDocument();
    rerender(<PoolStatsOverview pairData={pair} pairSummary={{ ...summary, volume_token: pair.token1.address, token_position: '1' }} onRetry={vi.fn()} />);
    expect(screen.getByText('SECOND priced in FIRST')).toBeInTheDocument();
  });
  it('keeps reserves visible when activity fails and allows retry without reporting false zeros', () => {
    const onRetry = vi.fn();
    setup({ failed: true, onRetry });
    expect(screen.getAllByText('—')).toHaveLength(3);
    expect(screen.queryByText('+2.84%')).not.toBeInTheDocument();
    expect(screen.getByText('2.50')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
  it('distinguishes loading, missing, and zero activity', () => {
    const { rerender } = setup({ loading: true });
    expect(screen.getByRole('status')).toHaveTextContent('Loading pool activity');
    expect(screen.getAllByText('—')).toHaveLength(3);
    rerender(<PoolStatsOverview pairData={pair} onRetry={vi.fn()} />);
    expect(screen.getAllByText('—')).toHaveLength(3);
    rerender(<PoolStatsOverview pairData={pair} pairSummary={summary} onRetry={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '30d' }));
    expect(screen.getByText('0.00')).toBeInTheDocument();
    expect(screen.getByText('0.00%')).toBeInTheDocument();
  });
  it('does not divide by zero or hide tiny nonzero reserves', () => {
    setup({ pairData: { ...pair, reserve0: '0', reserve1: '1' } });
    expect(screen.getByText('0.00')).toBeInTheDocument();
    expect(screen.getByText('1.00e-18')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Exchange rate' }));
    expect(screen.getByText('Exchange rate unavailable for empty or unknown reserves')).toBeInTheDocument();
  });
  it('treats malformed reserves and unknown decimals as unavailable', () => {
    setup({
      pairData: {
        ...pair, reserve0: '-1', token1: { ...pair.token1, decimals: undefined }, total_supply: '',
      },
    });
    expect(screen.getAllByText('—')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Exchange rate' }));
    expect(screen.getByText('Exchange rate unavailable for empty or unknown reserves')).toBeInTheDocument();
  });
});
