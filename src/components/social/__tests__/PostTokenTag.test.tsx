import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  describe, it, expect, vi,
} from 'vitest';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import { DEFAULT_PAST_TIMEFRAME } from '@/utils/constants';
import { TokenPill } from '../PostTokenTag';

// The price and chart slots pull in currency/i18n and a network sparkline; the pill's job under
// test is choosing which slots render, so they are stubbed to markers.
vi.mock('@/features/shared/components/PriceDataFormatter', () => ({
  default: () => <span data-testid="price">0.004078 AE</span>,
}));
vi.mock('@/features/trending/components/TokenLineChart', () => ({
  TokenLineChart: () => <span data-testid="chart">chart</span>,
}));

const ADVANCED = { chart: true, price: true, change: true };

function tokenWith(parts: Partial<TokenDto>): TokenDto {
  return {
    price_data: { price: '1' } as any,
    performance: { [DEFAULT_PAST_TIMEFRAME]: { current_change_percent: 2.4 } } as any,
    sale_address: 'ct_sale',
    ...parts,
  } as TokenDto;
}

function renderPill(node: React.ReactElement) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

describe('TokenPill', () => {
  it('renders rung 3 (mark, symbol, price, change, chart) as one link', () => {
    renderPill(<TokenPill symbol="SUPERHERO" options={ADVANCED} token={tokenWith({})} status="resolved" />);
    const link = screen.getByRole('link');
    expect(link).toHaveTextContent('#SUPERHERO');
    expect(screen.getByTestId('price')).toBeInTheDocument();
    expect(screen.getByTestId('chart')).toBeInTheDocument();
    expect(link.textContent).toContain('2.4%');
    // One spoken label, not four fragments.
    expect(link).toHaveAttribute('aria-label', expect.stringContaining('SUPERHERO'));
    expect(link.getAttribute('aria-label')).toContain('link');
  });

  it('degrades to price + change when the chart series is missing (no sale_address)', () => {
    renderPill(
      <TokenPill symbol="SUPERHERO" options={ADVANCED} token={tokenWith({ sale_address: undefined })} status="resolved" />,
    );
    expect(screen.getByTestId('price')).toBeInTheDocument();
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument();
    expect(screen.getByRole('link').textContent).toContain('2.4%');
  });

  it('degrades to symbol + change when the price is unavailable (drops price and chart)', () => {
    renderPill(
      <TokenPill symbol="SUPERHERO" options={ADVANCED} token={tokenWith({ price_data: undefined })} status="resolved" />,
    );
    expect(screen.queryByTestId('price')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chart')).not.toBeInTheDocument();
    expect(screen.getByRole('link').textContent).toContain('2.4%');
  });

  it('falls to symbol only when the 24h change is unavailable', () => {
    const token = tokenWith({ performance: undefined, price_data: undefined, sale_address: undefined });
    renderPill(<TokenPill symbol="SUPERHERO" options={ADVANCED} token={token} status="resolved" />);
    const link = screen.getByRole('link');
    expect(link).toHaveTextContent('#SUPERHERO');
    expect(link.textContent).not.toContain('%');
  });

  it('never skeletons the symbol while loading — only the data slots do', () => {
    const { container } = renderPill(
      <TokenPill symbol="SUPERHERO" options={ADVANCED} token={undefined} status="loading" />,
    );
    expect(screen.getByRole('link')).toHaveTextContent('#SUPERHERO');
    expect(container.querySelector('.sh-pill__skel--price')).toBeTruthy();
    expect(screen.queryByTestId('price')).not.toBeInTheDocument();
  });

  it('renders an unknown / delisted token as plain dashed text, no pill and no link', () => {
    const { container } = renderPill(
      <TokenPill symbol="NOTATOKEN" options={ADVANCED} token={null} status="unknown" />,
    );
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(container.querySelector('.sh-pill-plain')).toHaveTextContent('#NOTATOKEN');
  });

  it('truncates a long symbol with an ellipsis', () => {
    renderPill(
      <TokenPill symbol="VERYLONGTOKENNAME" options={{ chart: false, price: false, change: false }} token={tokenWith({})} status="resolved" />,
    );
    expect(screen.getByRole('link').textContent).toContain('…');
  });

  it('marks the last-known value with a stale dot when offline', () => {
    const { container } = renderPill(
      <TokenPill symbol="SUPERHERO" options={{ chart: false, price: true, change: true }} token={tokenWith({})} status="resolved" offline staleHours={2} />,
    );
    expect(container.querySelector('.sh-pill__stale-dot')).toBeTruthy();
    expect(screen.getByRole('link').getAttribute('aria-label')).toContain('last known 2h ago');
  });
});
