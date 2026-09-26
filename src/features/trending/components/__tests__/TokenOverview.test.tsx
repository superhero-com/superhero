import {
  fireEvent, render, screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import { Decimal } from '@/libs/decimal';
import TokenOverview from '../TokenOverview';

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe = vi.fn();

    disconnect = vi.fn();
  });
});
afterEach(() => vi.unstubAllGlobals());

const currency = vi.hoisted(() => ({ code: 'eur', rate: 0.01 }));
vi.mock('@/hooks/useCurrencies', () => ({
  useCurrencies: () => ({
    currentCurrencyCode: currency.code,
    currentCurrencyInfo: { symbol: '€' },
    currentCurrencyRate: currency.rate,
    getFiat: (amount: Decimal) => amount.mul(currency.rate),
  }),
}));
const token = {
  name: 'SUPERHERO',
  sale_address: 'ct_sale',
  collection: 'WORDS-ak_creator',
  rank: 2,
  price_data: { ae: '0.000000204', eur: '0.00000000204' },
  market_cap_data: { ae: '1500000000000000000000' },
  total_supply: '2000000000000000000000000',
  holders_count: 26,
  performance: { past_30d: { current_change_percent: 3.24, current_change_direction: 'down' } },
} as unknown as TokenDto;
const onShare = vi.fn();
const mount = (props: Partial<React.ComponentProps<typeof TokenOverview>> = {}) => render(
  <MemoryRouter><TokenOverview token={token} onShare={onShare} {...props} /></MemoryRouter>,
);
afterEach(() => { vi.restoreAllMocks(); currency.rate = 0.01; });

describe('Token overview', () => {
  it('keeps AE, aetto and token units distinct and respects explicit performance direction', () => {
    mount({ owned: true });
    expect(screen.getByRole('heading', { name: 'SUPERHERO' })).toBeInTheDocument();
    expect(screen.getByTitle('1,500')).toHaveTextContent('1,500');
    expect(screen.getByTitle('2,000,000')).toHaveTextContent('2,000,000');
    expect(screen.getByTitle('26')).toHaveTextContent('26');
    expect(screen.getByText('−3.24%')).toBeInTheDocument();
    expect(screen.getByText('30d')).toBeInTheDocument();
    expect(screen.getByText('In your wallet')).toBeInTheDocument();
    expect(screen.getByText('Rank #2')).toBeInTheDocument();
    expect(document.querySelector('.token-overview-fiat')).toHaveTextContent('€');
    expect(document.querySelector('.token-overview-fiat')).toHaveTextContent('EUR');
    expect(document.querySelector('.token-overview-price__value')).toHaveTextContent('2040');
    fireEvent.click(screen.getByRole('button', { name: 'Share SUPERHERO' }));
    expect(onShare).toHaveBeenCalledOnce();
    expect(screen.getByRole('link', { name: 'Back to Explore' })).toHaveAttribute('href', '/trends/tokens');
  });

  it('preserves real zeros without inventing missing prices or rates', () => {
    currency.rate = 0;
    mount({
      token: {
        ...token, price_data: { ae: 0 } as TokenDto['price_data'], performance: null, holders_count: 0,
      },
    });
    expect(document.querySelector('.token-overview-price__value')).toHaveTextContent('0.00AE');
    expect(document.querySelector('.token-overview-fiat')).toBeNull();
    expect(screen.getByTitle('0')).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it.each([
    [{ loading: true }, 'Loading market data'],
    [{ pending: true }, 'Awaiting confirmation'],
    [{ error: true }, 'Market data unavailable'],
  ])('distinguishes loading, confirmation and unavailable data', (state, message) => {
    mount({ token: null, tokenName: 'NEW-TREND', ...state });
    expect(screen.getByRole('status')).toHaveTextContent(message);
    expect(screen.getByRole('heading', { name: 'NEW-TREND' })).toBeInTheDocument();
    expect(screen.queryByText('Rank #2')).not.toBeInTheDocument();
    expect(document.querySelector('.token-overview-price__value')).toHaveTextContent('—');
    expect(document.querySelector('.token-overview-fiat')).toBeNull();
  });

  it('retains known data during refresh failure without calling the token uncreated', () => {
    mount({ error: true, loading: true });
    expect(screen.getByTitle('1,500')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Market data unavailable');
    expect(screen.queryByText(/not created/i)).not.toBeInTheDocument();
  });

  it('only offers expansion when the two-line description actually overflows', () => {
    const short = mount({ token: { ...token, metaInfo: { description: 'A short description.' } as TokenDto['metaInfo'] } });
    expect(screen.queryByRole('button', { name: 'Read more' })).not.toBeInTheDocument();
    short.unmount();
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(100);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(40);
    mount({ token: { ...token, metaInfo: { description: 'A longer community description.' } as TokenDto['metaInfo'] } });
    const expand = screen.getByRole('button', { name: 'Read more' });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(expand);
    expect(screen.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
  });
});
