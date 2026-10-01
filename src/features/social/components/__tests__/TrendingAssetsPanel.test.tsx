import {
  fireEvent, render, screen, within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import { changeLanguage } from '@/i18n';
import TrendingAssetsPanel from '../TrendingAssetsPanel';

const token = (overrides: Record<string, unknown> = {}) => ({
  name: '牛来 / AE',
  symbol: '牛来 / AE',
  address: 'ct_token',
  sale_address: 'ct_sale',
  collection: 'CHINESE-ak_creator',
  price_data: { ae: '0.000000004106' },
  market_cap_data: { ae: '1234560000000000000000000' },
  holders_count: 316,
  performance: {
    past_30d: { current: 1, current_change_percent: '9.31', current_change_direction: 'down' },
  },
  ...overrides,
} as unknown as TokenDto);

const view = (items: TokenDto[], options = {}) => (
  <MemoryRouter><TrendingAssetsPanel items={items} {...options} /></MemoryRouter>
);

beforeEach(async () => {
  await changeLanguage('en');
  vi.stubGlobal('ResizeObserver', class {
    observe = vi.fn();

    disconnect = vi.fn();
  });
});

describe('Trending assets panel', () => {
  it('preserves tiny prices, converts cap from aettos, and aligns the chart with the change period', () => {
    render(view([token()]));
    const card = screen.getByRole('link', { name: 'View 牛来 / AE' });
    expect(card).toHaveAttribute('href', `/trends/tokens/${encodeURIComponent('牛来 / AE')}`);
    expect(card).toHaveTextContent('0.000000004106 AE');
    expect(card).toHaveTextContent('1.23M AE');
    expect(card).toHaveTextContent('316');
    expect(card).toHaveTextContent('−9.31%');
    expect(within(card).getByRole('img').getAttribute('src'))
      .toContain('/ct_sale/sparkline.svg?interval=30d&');
  });

  it('distinguishes zero metrics from missing metrics and does not invent price history', () => {
    const { rerender } = render(view([token({
      price_data: { ae: '0' },
      market_cap_data: { ae: '0' },
      holders_count: 0,
      performance: { past_30d: { current: 0, current_change_percent: 0 } },
    })]));
    const card = screen.getByRole('link', { name: 'View 牛来 / AE' });
    expect(within(card).getByText('0.00%')).toHaveClass('is-neutral');
    expect(within(card).getByText('Price per token').nextElementSibling).toHaveTextContent('0 AE');
    expect(within(card).getByText('Market cap').nextElementSibling).toHaveTextContent('0 AE');
    expect(within(card).getByText('Holders').nextElementSibling).toHaveTextContent('0');
    rerender(view([token({
      price_data: { ae: 'invalid' },
      market_cap_data: { ae: 'invalid' },
      holders_count: null,
      performance: { past_30d: null },
    })]));
    expect(within(card).queryByRole('img')).not.toBeInTheDocument();
    expect(within(card).getByText('No 30-day history')).toBeInTheDocument();
    expect(card).not.toHaveTextContent('0.00%');
    expect(within(card).getAllByText('—', { exact: false })).toHaveLength(4);
  });

  it('shows a quiet placeholder when an image fails, and preserves very small positive changes', () => {
    render(view([token({
      performance: {
        past_30d: { current: 1, current_change_percent: 0.0075, current_change_direction: 'up' },
      },
    })]));
    expect(screen.getByText('+<0.01%')).toHaveClass('is-up');
    fireEvent.error(screen.getByRole('img'));
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('No 30-day history')).toBeInTheDocument();
  });

  it('labels later feed sections by their market-cap ordering and announces loading', () => {
    const { rerender } = render(view([], { loading: true }));
    expect(screen.getByRole('region')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Loading trending assets');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    rerender(view([token()], { byMarketCap: true }));
    expect(screen.getByRole('heading', { name: 'Market leaders' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all' })).toHaveAttribute('href', '/trends/tokens');
  });

  it('reaches the end in one step when only a small gutter remains, then disables Next', () => {
    const { container } = render(view([token()]));
    const track = container.querySelector('.feed-assets__track') as HTMLElement;
    Object.defineProperties(track, {
      clientWidth: { configurable: true, value: 754 },
      scrollWidth: { configurable: true, value: 1018 },
      scrollLeft: { configurable: true, writable: true, value: 0 },
    });
    Object.defineProperty(track.firstElementChild, 'offsetWidth', { value: 244 });
    track.scrollBy = vi.fn();
    fireEvent.scroll(track);
    expect(screen.getByRole('button', { name: 'Previous assets' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next assets' }));
    expect(track.scrollBy).toHaveBeenCalledWith({ left: 264, behavior: 'smooth' });
    track.scrollLeft = 264;
    fireEvent.scroll(track);
    expect(screen.getByRole('button', { name: 'Next assets' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Previous assets' }));
    expect(track.scrollBy).toHaveBeenLastCalledWith({ left: -264, behavior: 'smooth' });
  });
});
