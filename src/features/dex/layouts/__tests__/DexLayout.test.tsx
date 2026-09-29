import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import DexLayout from '../DexLayout';

const History = () => {
  const navigate = useNavigate();
  return <button type="button" onClick={() => navigate(-1)}>Back</button>;
};

describe('DeFi navigation', () => {
  it('preserves only the selected pair between Swap and Pool, using normal links', () => {
    render(<MemoryRouter initialEntries={['/defi/swap?from=AE&to=ct_pair&tab=history']}><DexLayout><History /></DexLayout></MemoryRouter>);
    const pool = screen.getByRole('link', { name: 'Pool' });
    expect(pool).toHaveAttribute('href', '/defi/pool?from=AE&to=ct_pair');
    expect(screen.getByRole('link', { name: 'Wrap' })).toHaveAttribute('href', '/defi/wrap');
    expect(screen.getByRole('link', { name: 'Tokens' })).toHaveAttribute('href', '/defi/explore/tokens');
    fireEvent.click(pool);
    expect(pool).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Swap' })).toHaveAttribute('href', '/defi/swap?from=AE&to=ct_pair');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('link', { name: 'Swap' })).toHaveAttribute('aria-current', 'page');
  });

  it('opens Explore on nested routes, restores it on back, and closes it with Escape', () => {
    render(<MemoryRouter initialEntries={['/defi/explore/pools/ct_pool?from=unrelated']}><DexLayout><History /></DexLayout></MemoryRouter>);
    const toggle = screen.getByRole('button', { name: 'Explore' });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: 'Pools' })).toHaveAttribute('aria-current', 'page');
    fireEvent.keyDown(screen.getByRole('link', { name: 'Pools' }), { key: 'Escape' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveFocus();
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(screen.getByRole('link', { name: 'Swap' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('link', { name: 'Swap' })).toHaveAttribute('href', '/defi/swap');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });
});
