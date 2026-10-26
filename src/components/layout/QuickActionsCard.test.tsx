import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import QuickActionsCard from './QuickActionsCard';

describe('QuickActionsCard', () => {
  it('lists DeFi actions in the same order as the DeFi tabs, with chat last', () => {
    render(<MemoryRouter><QuickActionsCard /></MemoryRouter>);
    const card = screen.getByRole('region', { name: 'Quick Actions' });
    const links = within(card).getAllByRole('link');
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/trends/create',
      '/defi/swap',
      '/defi/pool',
      '/defi/wrap',
      'https://quali.chat',
    ]);
  });

  it('does not duplicate the Explore entry from the main navigation', () => {
    render(<MemoryRouter><QuickActionsCard /></MemoryRouter>);
    expect(screen.queryByRole('link', { name: /explore/i })).not.toBeInTheDocument();
  });
});
