import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect } from 'vitest';
import PostHashtagLink, { type TrendMention } from '../PostHashtagLink';

// A mention carrying its own performance so no network call is needed: PostHashtagLink reads
// the 24h change straight off it. DEFAULT_PAST_TIMEFRAME is past_30d.
const MENTION: TrendMention = {
  name: 'SUPERHERO',
  symbol: 'SUPERHERO',
  address: 'ct_super',
  sale_address: 'ct_super',
  performance: { past_30d: { current_change_percent: 12.5 } },
};

const FLAT_MENTION: TrendMention = {
  name: 'SUPERHERO',
  symbol: 'SUPERHERO',
  address: 'ct_super',
  sale_address: 'ct_super',
  performance: { past_30d: { current_change_percent: 0 } },
};

// A sub-0.05% move: renders 0.0% on the 1dp badge, but 0.03% on the legacy 2dp render.
const NEAR_FLAT_MENTION: TrendMention = {
  name: 'SUPERHERO',
  symbol: 'SUPERHERO',
  address: 'ct_super',
  sale_address: 'ct_super',
  performance: { past_30d: { current_change_percent: 0.03 } },
};

function renderTag(showChange?: boolean) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PostHashtagLink
          tag="SUPERHERO"
          label="#SUPERHERO"
          variant="inline"
          trendMentions={[MENTION]}
          showChange={showChange}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderVariant(variant: 'inline' | 'post-pill', mention: TrendMention) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <PostHashtagLink tag="SUPERHERO" label="#SUPERHERO" variant={variant} trendMentions={[mention]} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('PostHashtagLink — showChange', () => {
  it('shows the 24h change badge by default (today\'s rendering, unchanged)', () => {
    renderTag(undefined);
    expect(screen.getByRole('link', { name: /#SUPERHERO/ })).toBeInTheDocument();
    expect(screen.getByText('12.50%')).toBeInTheDocument();
  });

  it('hides the change badge when showChange is false ({change=0} → only the tag)', () => {
    renderTag(false);
    expect(screen.getByRole('link', { name: /#SUPERHERO/ })).toBeInTheDocument();
    expect(screen.queryByText('12.50%')).not.toBeInTheDocument();
  });

  it('post-pill: a flat token shows a neutral badge — no arrow, no collapse to rung 0', () => {
    const { container } = renderVariant('post-pill', FLAT_MENTION);
    const link = screen.getByRole('link');
    expect(link.textContent).toContain('0.0%');
    expect(container.querySelector('.sh-pill__chg--flat')).toBeTruthy();
    expect(container.querySelector('.sh-pill__chg-arrow')).toBeNull();
    const aria = link.getAttribute('aria-label') || '';
    expect(aria).toContain('unchanged');
    expect(aria).not.toMatch(/\b(up|down)\b/);
  });

  it('legacy inline variant is unchanged at flat — still no badge', () => {
    renderVariant('inline', FLAT_MENTION);
    const link = screen.getByRole('link');
    expect(link.textContent).not.toContain('%');
    expect(link.textContent).not.toContain('▲');
    expect(link.textContent).not.toContain('▼');
  });

  it('post-pill: a sub-0.05% move renders flat — a 0.0% badge never points anywhere', () => {
    const { container } = renderVariant('post-pill', NEAR_FLAT_MENTION);
    const link = screen.getByRole('link');
    expect(link.textContent).toContain('0.0%');
    expect(container.querySelector('.sh-pill__chg--flat')).toBeTruthy();
    expect(container.querySelector('.sh-pill__chg-arrow')).toBeNull();
    const aria = link.getAttribute('aria-label') || '';
    expect(aria).toContain('unchanged');
    expect(aria).not.toMatch(/\b(up|down)\b/);
  });

  it('legacy inline variant keeps its exact-zero flat notion — a sub-0.05% move still shows 2dp', () => {
    renderVariant('inline', NEAR_FLAT_MENTION);
    const link = screen.getByRole('link');
    // Legacy renders at 2dp and Marek ruled its behaviour out of scope: 0.03% is non-zero here,
    // so it keeps its arrow rather than adopting the badge's <0.05 flat threshold.
    expect(link.textContent).toContain('0.03%');
    expect(link.textContent).toContain('▲');
  });
});
