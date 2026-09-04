import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';
import { AccountMentionPill } from '../AccountMentionPill';

// The pill resolves the chain name via a batched network hook; pin it per test so these
// render assertions stay deterministic and offline.
const mockUseChainName = vi.fn();
vi.mock('@/hooks/useChainName', () => ({
  useChainName: (address: string) => mockUseChainName(address),
}));

const ADDR = 'ak_2mMPQ2E9zN8Dd6Fm8jrThQvcYQ7cwR3hh6iC5xGZ2gZ4tHacBdEf';

function renderPill() {
  return render(
    <MemoryRouter>
      <AccountMentionPill address={ADDR} />
    </MemoryRouter>,
  );
}

describe('AccountMentionPill', () => {
  beforeEach(() => {
    mockUseChainName.mockReset();
  });

  it('resolved name → identicon, @name, and the muted address beside it', () => {
    mockUseChainName.mockReturnValue({ chainName: 'superhero.chain' });
    const { container } = renderPill();

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `/users/${ADDR}`);
    expect(container.querySelector('.sh-pill__avatar')).toBeInTheDocument();
    expect(container.querySelector('.sh-pill__symbol')).toHaveTextContent('@superhero.chain');
    // Address is present as a distinct trailing part, not folded into the handle text.
    expect(container.querySelector('.sh-pill__addr')?.textContent).toMatch(/^ak_/);
    // One spoken label folds in the address; the visible parts are aria-hidden.
    expect(link.getAttribute('aria-label')).toContain('superhero.chain');
    expect(link.getAttribute('aria-label')).toContain('mention');
  });

  it('no name → identicon + shortened address as the label, no duplicate trailing', () => {
    mockUseChainName.mockReturnValue({ chainName: null });
    const { container } = renderPill();

    const link = screen.getByRole('link');
    expect(container.querySelector('.sh-pill__avatar')).toBeInTheDocument();
    expect(link.textContent).toMatch(/^@ak_/);
    expect(container.querySelector('.sh-pill__addr')).not.toBeInTheDocument();
  });
});
