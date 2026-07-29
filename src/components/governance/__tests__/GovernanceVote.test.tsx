// The dangerous-scheme literals below (javascript:/data:) are URL-scheme regression-test
// fixtures, not real navigations — disabling the (correct, in production code) no-script-url
// lint rule for this file only.
/* eslint-disable no-script-url */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  describe, expect, it, vi,
} from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import GovernanceVote from '../GovernanceVote';

const POLL_ADDRESS = 'ct_1PnNLieJHnXKX3MShkSAMX9gcNgYEhxzqYqpQcqgFp75sWNWX';

function renderGovernanceVote() {
  return render(
    <MemoryRouter>
      <GovernanceVote pollId={POLL_ADDRESS} setActiveTab={vi.fn()} />
    </MemoryRouter>,
  );
}

function makePoll(link: string) {
  return {
    pollState: {
      metadata: {
        title: 'Should we do the thing?',
        description: 'A poll description.',
        link,
      },
      vote_options: { 0: 'Yes', 1: 'No' },
      author: 'ak_2CQXoTZR9Le3T9GkQPjuBSNSKw6NUFXk1cEsHXaBWmJyPnPYSA',
    },
  };
}

let mockPollLink = 'https://example.com/proposal';

vi.mock('@/hooks', () => ({
  useAeSdk: () => ({ activeAccount: undefined }),
  useAccount: () => ({ decimalBalance: undefined }),
  useGovernance: () => ({
    usePoll: () => ({ data: makePoll(mockPollLink) }),
    usePollResults: () => ({ data: undefined }),
    useSubmitVote: () => ({ mutateAsync: vi.fn() }),
    useRevokeVote: () => ({ mutate: vi.fn() }),
    useDelegation: () => ({ data: undefined }),
    useDelegators: () => ({ data: [] }),
  }),
}));

describe('GovernanceVote (scheme-validated poll link)', () => {
  it('renders a javascript: poll link as inert (no javascript: href in the DOM)', () => {
    mockPollLink = 'javascript:alert(1)';
    renderGovernanceVote();

    // No anchor pointing at the poll link should exist at all — the payload is unsafe and the
    // link section is not rendered.
    expect(document.body.innerHTML).not.toContain('javascript:alert');
    const anchors = Array.from(document.querySelectorAll('a'));
    expect(anchors.every((a) => !(a.getAttribute('href') ?? '').toLowerCase().startsWith('javascript:'))).toBe(true);
  });

  it('renders a data:text/html poll link as inert', () => {
    mockPollLink = 'data:text/html,<script>alert(1)</script>';
    renderGovernanceVote();
    expect(document.body.innerHTML).not.toContain('data:text/html');
  });

  it('renders a whitespace-obfuscated javascript: poll link as inert', () => {
    mockPollLink = 'java\tscript:alert(1)';
    renderGovernanceVote();
    expect(document.body.innerHTML).not.toContain('javascript:alert');
  });

  it('renders a legitimate https poll link with rel="noopener noreferrer"', () => {
    mockPollLink = 'https://example.com/proposal';
    renderGovernanceVote();

    const anchor = screen.getByText('https://example.com/proposal').closest('a');
    expect(anchor).toHaveAttribute('href', 'https://example.com/proposal');
    expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
    expect(anchor).toHaveAttribute('target', '_blank');
  });
});
