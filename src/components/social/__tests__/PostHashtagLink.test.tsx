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
});
