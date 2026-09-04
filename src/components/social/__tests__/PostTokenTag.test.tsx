import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  describe, it, expect, vi,
} from 'vitest';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import { DEFAULT_PAST_TIMEFRAME } from '@/utils/constants';
import { TokenPill } from '../PostTokenTag';

// The price slot pulls in currency/i18n; the candlestick pulls in lightweight-charts and a
// network query. The pill's job under test is choosing which slots render, so both are stubbed
// to markers. Price and market cap share the formatter — `bignumber` distinguishes market cap.
vi.mock('@/features/shared/components/PriceDataFormatter', () => ({
  default: ({ bignumber }: { bignumber?: boolean }) => (
    <span data-testid={bignumber ? 'mcap' : 'price'}>{bignumber ? '$1.2M' : '0.004078 AE'}</span>
  ),
}));
vi.mock('../TokenTagCandleChart', () => ({
  default: () => <span data-testid="candles">candles</span>,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const ADVANCED = { chart: true, price: true, change: true };
const COMPACT = { chart: false, price: true, change: true };
const SYMBOL_ONLY = { chart: false, price: false, change: false };

function tokenWith(parts: Partial<TokenDto>): TokenDto {
  return {
    price_data: { price: '1' } as any,
    market_cap_data: { ae: '1200000' } as any,
    performance: { [DEFAULT_PAST_TIMEFRAME]: { current_change_percent: 2.4 } } as any,
    sale_address: 'ct_sale',
    ...parts,
  } as TokenDto;
}

function renderPill(node: React.ReactElement) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

describe('TokenPill — inline (rungs 0-2)', () => {
  it('renders an unknown / delisted token as plain dashed text, no pill and no link', () => {
    const { container } = renderPill(
      <TokenPill symbol="NOTATOKEN" options={ADVANCED} token={null} status="unknown" />,
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container.querySelector('.sh-pill-plain')).toHaveTextContent('#NOTATOKEN');
  });

  it('truncates a long symbol with an ellipsis', () => {
    renderPill(
      <TokenPill symbol="VERYLONGTOKENNAME" options={SYMBOL_ONLY} token={tokenWith({})} status="resolved" />,
    );
    expect(screen.getByRole('link').textContent).toContain('…');
  });

  it('marks the last-known value with a stale dot when offline', () => {
    const { container } = renderPill(
      <TokenPill symbol="SUPERHERO" options={COMPACT} token={tokenWith({})} status="resolved" offline staleHours={2} />,
    );
    expect(container.querySelector('.sh-pill__stale-dot')).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('aria-label')).toContain('last known 2h ago');
  });
});

describe('TokenPill — advanced row (chart resolved true)', () => {
  it('renders the full row — symbol, price, market cap, change and candlestick — as one link', () => {
    renderPill(<TokenPill symbol="SUPERHERO" options={ADVANCED} token={tokenWith({})} status="resolved" />);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('sh-token-row');
    expect(link).toHaveTextContent('#SUPERHERO');
    expect(screen.getByTestId('price')).toBeInTheDocument();
    expect(screen.getByTestId('mcap')).toBeInTheDocument();
    expect(screen.getByTestId('candles')).toBeInTheDocument();
    expect(link.textContent).toContain('2.4%');
    expect(link.getAttribute('aria-label')).toContain('SUPERHERO');
    expect(link.getAttribute('aria-label')).toContain('link');
  });

  it('keeps the candlestick when the price is unavailable — the price precondition is dropped', () => {
    renderPill(
      <TokenPill symbol="SUPERHERO" options={ADVANCED} token={tokenWith({ price_data: undefined })} status="resolved" />,
    );
    expect(screen.queryByTestId('price')).not.toBeInTheDocument();
    expect(screen.getByTestId('candles')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveClass('sh-token-row');
    expect(screen.getByRole('link').textContent).toContain('2.4%');
  });

  it('drops only the candlestick when the token has no sale_address, still a row', () => {
    renderPill(
      <TokenPill symbol="SUPERHERO" options={ADVANCED} token={tokenWith({ sale_address: undefined })} status="resolved" />,
    );
    expect(screen.getByTestId('price')).toBeInTheDocument();
    expect(screen.queryByTestId('candles')).not.toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveClass('sh-token-row');
  });

  it('omits the market-cap slot when market_cap_data is absent, without blanking the row', () => {
    renderPill(
      <TokenPill symbol="SUPERHERO" options={ADVANCED} token={tokenWith({ market_cap_data: undefined })} status="resolved" />,
    );
    expect(screen.queryByTestId('mcap')).not.toBeInTheDocument();
    expect(screen.getByTestId('price')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveTextContent('#SUPERHERO');
  });

  it('honours {mode=advanced;price=0} — a row without a price but with the candlestick', () => {
    renderPill(
      <TokenPill symbol="SUPERHERO" options={{ chart: true, price: false, change: true }} token={tokenWith({})} status="resolved" />,
    );
    expect(screen.queryByTestId('price')).not.toBeInTheDocument();
    expect(screen.getByTestId('candles')).toBeInTheDocument();
    expect(screen.getByTestId('mcap')).toBeInTheDocument();
  });

  it('falls to symbol only when price, chart and change are all unavailable', () => {
    const token = tokenWith({
      performance: undefined,
      price_data: undefined,
      sale_address: undefined,
      market_cap_data: undefined,
    });
    renderPill(<TokenPill symbol="SUPERHERO" options={ADVANCED} token={token} status="resolved" />);
    const link = screen.getByRole('link');
    expect(link).toHaveTextContent('#SUPERHERO');
    expect(link.textContent).not.toContain('%');
    expect(screen.queryByTestId('candles')).not.toBeInTheDocument();
  });

  it('never skeletons the symbol while loading — only the data slots do', () => {
    const { container } = renderPill(
      <TokenPill symbol="SUPERHERO" options={ADVANCED} token={undefined} status="loading" />,
    );
    expect(screen.getByRole('link')).toHaveTextContent('#SUPERHERO');
    expect(container.querySelector('.sh-pill__skel--price')).toBeTruthy();
    expect(screen.queryByTestId('price')).not.toBeInTheDocument();
  });

  it('renders a flat (0%) token neutrally — no arrow, no direction spoken', () => {
    const token = tokenWith({
      performance: { [DEFAULT_PAST_TIMEFRAME]: { current_change_percent: 0 } } as any,
    });
    const { container } = renderPill(
      <TokenPill symbol="SUPERHERO" options={ADVANCED} token={token} status="resolved" />,
    );
    const link = screen.getByRole('link');
    expect(link.textContent).toContain('0.0%');
    expect(container.querySelector('.sh-pill__chg--flat')).toBeTruthy();
    expect(container.querySelector('.sh-pill__chg-arrow')).toBeNull();
    const aria = link.getAttribute('aria-label') || '';
    expect(aria).toContain('unchanged');
    expect(aria).not.toMatch(/\b(up|down)\b/);
  });

  it('treats a sub-0.05% move as flat — a value that renders 0.0% never points anywhere', () => {
    const token = tokenWith({
      performance: { [DEFAULT_PAST_TIMEFRAME]: { current_change_percent: 0.04 } } as any,
    });
    const { container } = renderPill(
      <TokenPill symbol="SUPERHERO" options={ADVANCED} token={token} status="resolved" />,
    );
    const link = screen.getByRole('link');
    expect(link.textContent).toContain('0.0%');
    expect(container.querySelector('.sh-pill__chg--flat')).toBeTruthy();
    expect(container.querySelector('.sh-pill__chg-arrow')).toBeNull();
    const aria = link.getAttribute('aria-label') || '';
    expect(aria).toContain('unchanged');
    expect(aria).not.toMatch(/\b(up|down)\b/);
  });
});
