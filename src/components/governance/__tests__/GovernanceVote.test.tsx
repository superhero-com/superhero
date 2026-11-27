// The dangerous-scheme literals below (javascript:/data:) are URL-scheme regression-test
// fixtures, not real navigations — disabling the (correct, in production code) no-script-url
// lint rule for this file only.
/* eslint-disable no-script-url */
import React from 'react';
import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  beforeEach, describe, expect, it, vi,
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

let mockCloseHeight = 200;

function makePoll(link: string) {
  return {
    pollState: {
      metadata: {
        title: 'Should we do the thing?',
        description: 'A poll description.',
        link,
      },
      vote_options: { 2: 'Yes', 7: 'No' },
      close_height: mockCloseHeight,
      author: 'ak_2CQXoTZR9Le3T9GkQPjuBSNSKw6NUFXk1cEsHXaBWmJyPnPYSA',
    },
  };
}

const mockSubmit = vi.fn();
let mockAccount: string | undefined;
let mockResults: { options: { value: number; votes: number; percentageOfTotal: number; optionStake: string }[]; totalVotes: number } | undefined;

vi.mock('@/components/ConnectWalletButton', () => ({ ConnectWalletButton: () => <button type="button">Connect wallet</button> }));

let mockPollLink = 'https://example.com/proposal';

vi.mock('@/hooks', () => ({
  useAeSdk: () => ({ activeAccount: mockAccount, currentBlockHeight: 100 }),
  useAccount: () => ({ decimalBalance: undefined }),
  useGovernance: () => ({
    usePoll: () => ({ data: makePoll(mockPollLink) }),
    usePollResults: () => ({ data: mockResults }),
    useSubmitVote: () => ({ mutateAsync: mockSubmit }),
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

describe('GovernanceVote ballot and weighted results', () => {
  beforeEach(() => {
    mockSubmit.mockReset().mockResolvedValue(undefined);
    mockAccount = 'ak_test';
    mockCloseHeight = 200;
    mockResults = {
      totalVotes: 10,
      options: [
        {
          value: 2, votes: 4, percentageOfTotal: 1.58, optionStake: '1000000000000000000',
        },
        {
          value: 7, votes: 6, percentageOfTotal: 98.42, optionStake: '62000000000000000000',
        },
      ],
    };
  });

  it('shows AE-weighted percentages, independently of voter headcount', () => {
    renderGovernanceVote();
    expect(screen.getByRole('progressbar', { name: 'Yes' })).toHaveAttribute('aria-valuenow', '1.58');
    expect(screen.getByRole('progressbar', { name: 'No' })).toHaveAttribute('aria-valuenow', '98.42');
    expect(screen.getByText('4 voters')).toBeInTheDocument();
    expect(screen.queryByText('40%')).not.toBeInTheDocument();
  });

  it('requires explicit submission and sends the contract option ID', async () => {
    renderGovernanceVote();
    expect(screen.getByRole('button', { name: 'Submit vote' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: 'No' }));
    expect(mockSubmit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Submit vote' }));
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledWith({ pollAddress: POLL_ADDRESS, option: 7 }));
    expect(await screen.findByRole('status')).toHaveTextContent('Your vote is recorded');
  });

  it('prevents voting at the closing height', () => {
    mockCloseHeight = 100;
    renderGovernanceVote();
    expect(screen.queryByRole('button', { name: 'Submit vote' })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });

  it('keeps a rejected vote editable and reports the failure', async () => {
    mockSubmit.mockRejectedValue(new Error('Wallet rejected'));
    renderGovernanceVote();
    fireEvent.click(screen.getByRole('radio', { name: 'Yes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Submit vote' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit vote' })).toBeEnabled();
    expect(screen.getByRole('radio', { name: 'Yes' })).toBeChecked();
  });
});
