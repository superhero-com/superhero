import {
  fireEvent, render, screen, within,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import {
  describe, expect, it, vi,
} from 'vitest';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import { Decimal } from '@/libs/decimal';
import ExploreTokenMarkets from '../ExploreTokenMarkets';

vi.mock('@/hooks/useCurrencies', () => ({
  useCurrencies: () => ({ currentCurrencyCode: 'usd', getFiat: () => Decimal.ZERO }),
}));

const token = {
  address: 'ct_token',
  sale_address: 'ct_sale',
  name: 'LONG-TOKEN',
  symbol: 'LONG-TOKEN',
  collection: 'CHINESE-ak_creator',
  price_data: { ae: '0.000000204' },
  market_cap_data: { ae: '1500000000000000000000' },
  total_supply: '2000000000000000000000000',
  performance: {
    past_24h: { current_change_percent: 4.2, current_change_direction: 'down' },
    past_7d: null,
    past_30d: { current_change_percent: 0, volume: '0' },
  },
} as unknown as TokenDto;
const props = {
  pages: [{ items: [token] }],
  layout: 'table' as const,
  orderBy: 'price' as const,
  orderDirection: 'DESC' as const,
  onSort: vi.fn(),
};
const Location = () => <span aria-label="Path">{useLocation().pathname}</span>;

const mount = (overrides: Partial<React.ComponentProps<typeof ExploreTokenMarkets>> = {}) => (
  render(
    <MemoryRouter>
      <ExploreTokenMarkets {...props} {...overrides} />
      <Location />
    </MemoryRouter>,
  )
);

describe('Explore market layouts', () => {
  it('keeps exact AE units, performance direction and rank across pages in both views', () => {
    const pages = [{ items: [token] }, {
      items: [{
        ...token, address: 'ct_two', name: 'SECOND', symbol: 'SECOND',
      }],
    }];
    const view = mount({ pages, rankOffset: 20 });
    expect(screen.getAllByRole('link', { name: 'View LONG-TOKEN' })).toHaveLength(1);
    expect(screen.getAllByTitle('1,500 AE')).toHaveLength(2);
    expect(screen.getByText('21')).toBeInTheDocument();
    expect(screen.getByText('22')).toBeInTheDocument();
    expect(screen.getAllByText('−4.20%')).toHaveLength(2);
    expect(screen.getAllByText('2040')).toHaveLength(2);
    expect(screen.getAllByAltText('Token Line Chart')[0]).toHaveAttribute('src', expect.stringContaining('/ct_sale/sparkline.svg?interval=all-time'));
    view.unmount();

    mount({ pages, layout: 'cards', rankOffset: 20 });
    const card = screen.getByRole('link', { name: 'View LONG-TOKEN' });
    expect(card).toHaveAttribute('href', '/trending/tokens/LONG-TOKEN');
    expect(within(card).getByTitle('1,500 AE')).toHaveTextContent('1.50K AE');
    expect(within(card).getByTitle('2,000,000')).toHaveTextContent('2.00M');
    expect(within(card).getByText('−4.20%')).toBeInTheDocument();
    expect(within(card).getByLabelText('Rank 21')).toBeInTheDocument();
    expect(within(card).getByTitle('0')).toHaveTextContent('0');
  });

  it('sorts with keyboard-accessible headers and supports row keyboard and modified clicks', () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Price AE' }));
    expect(props.onSort).toHaveBeenCalledWith('price');
    const row = screen.getByRole('link', { name: 'View LONG-TOKEN' });
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    fireEvent.click(row, { ctrlKey: true });
    expect(open).toHaveBeenCalledWith('/trending/tokens/LONG-TOKEN', '_blank', 'noopener');
    open.mockRestore();
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(screen.getByLabelText('Path')).toHaveTextContent('/trending/tokens/LONG-TOKEN');
  });

  it('shows a chart fallback on failure and navigates cards as native links', () => {
    mount({ layout: 'cards' });
    fireEvent.error(screen.getByAltText('Token Line Chart'));
    expect(screen.getByText('Price history unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'View LONG-TOKEN' }));
    expect(screen.getByLabelText('Path')).toHaveTextContent('/trending/tokens/LONG-TOKEN');
  });

  it.each(['table', 'cards'] as const)('handles loading, refetches, missing values and empty %s results', (layout) => {
    const view = mount({ layout, pages: [], loading: true });
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    view.unmount();
    const loaded = mount({
      layout, loading: true, pages: [{ items: [{ ...token, performance: null }] }],
    });
    expect(screen.getByRole('link', { name: 'View LONG-TOKEN' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
    loaded.unmount();
    mount({ layout, pages: [], loading: false });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
