import {
  fireEvent, render, screen, within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  describe, expect, it, vi,
} from 'vitest';
import ExploreUsers from '../ExploreUsers';

const address = 'ak_8WwpJCixn9cKe3jAyXvxNeo5JrBFKj43ULkUeTfeLMqLiZPjj';
const props = {
  items: [{
    address, pnl_usd: -25.61, roi_pct: 0, aum_usd: undefined,
  }],
  layout: 'list' as const,
  onLayoutChange: vi.fn(),
  onRetry: vi.fn(),
};

describe('Explore Users', () => {
  it.each(['list', 'cards'] as const)('keeps full identities, signs, zero and missing values in %s', (layout) => {
    render(<MemoryRouter><ExploreUsers {...props} layout={layout} /></MemoryRouter>);
    const trader = screen.getByRole('link', { name: `View profile: ${address}` });
    expect(trader).toHaveAttribute('href', `/users/${address}`);
    expect(within(trader).getAllByText(address)).toHaveLength(2);
    expect(within(trader).getByText('-$25.61')).toBeInTheDocument();
    expect(within(trader).getByText('0.00%')).toBeInTheDocument();
    expect(within(trader).getByText('—')).toBeInTheDocument();
    expect(within(trader).getByLabelText('Rank 1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View leaderboard' })).toHaveAttribute('href', '/trends/leaderboard');
  });

  it('retains all loaded results during a failed background refresh and allows retry', () => {
    const items = Array.from({ length: 12 }, (_, i) => ({ address: `${address}${i}`, chain_name: `trader-${i}.chain` }));
    render(<MemoryRouter><ExploreUsers {...props} items={items} error /></MemoryRouter>);
    expect(screen.getAllByRole('link', { name: /View profile:/ })).toHaveLength(12);
    expect(screen.getByText('Couldn’t refresh traders')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(props.onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('No traders to show yet')).not.toBeInTheDocument();
  });

  it('distinguishes first loading, failure and empty results', () => {
    const view = render(
      <MemoryRouter><ExploreUsers {...props} items={[]} loading /></MemoryRouter>,
    );
    expect(screen.getByRole('status', { name: 'Loading traders' })).toBeInTheDocument();
    expect(screen.queryByText('No traders to show yet')).not.toBeInTheDocument();
    view.rerender(
      <MemoryRouter><ExploreUsers {...props} items={[]} error fetching /></MemoryRouter>,
    );
    expect(screen.getByText('Couldn’t load traders')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Loading traders' })).toBeDisabled();
    view.rerender(<MemoryRouter><ExploreUsers {...props} items={[]} /></MemoryRouter>);
    expect(screen.getByText('No traders to show yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
});
