import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';
import { InlineAccountMention } from '../InlineAccountMention';

// The chip resolves the chain name via a batched network hook; pin it per test so
// these render assertions stay deterministic and offline.
const mockUseChainName = vi.fn();
vi.mock('@/hooks/useChainName', () => ({
  useChainName: (address: string) => mockUseChainName(address),
}));

const ADDR = 'ak_2mMPQ2E9zN8Dd6Fm8jrThQvcYQ7cwR3hh6iC5xGZ2gZ4tHacBdEf';

function renderChip() {
  return render(
    <MemoryRouter>
      <InlineAccountMention address={ADDR} />
    </MemoryRouter>,
  );
}

describe('InlineAccountMention', () => {
  beforeEach(() => {
    mockUseChainName.mockReset();
  });

  it('shows chain name and the muted address when a name resolves', () => {
    mockUseChainName.mockReturnValue({ chainName: 'alice.chain' });
    renderChip();

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `/users/${ADDR}`);
    expect(link.textContent).toContain('@alice.chain');
    // Both the name and the shortened address are present in the same chip.
    expect(link.textContent).toContain('ak_');
    expect(link.textContent).toContain('...');
  });

  it('falls back to avatar + shortened address, unchanged, when no name resolves', () => {
    mockUseChainName.mockReturnValue({ chainName: null });
    renderChip();

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', `/users/${ADDR}`);
    // No second address line: label is the shortened address, '@'-prefixed.
    expect(link.textContent).toMatch(/^@ak_/);
    expect(link.textContent).not.toContain('@alice');
  });
});
