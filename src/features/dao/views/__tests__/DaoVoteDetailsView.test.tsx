// The dangerous-scheme literals below (javascript:/data:) are HARDEN-05 regression-test
// fixtures, not real navigations — disabling the (correct, in production code) no-script-url
// lint rule for this file only.
/* eslint-disable no-script-url */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  describe, expect, it, vi,
} from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import DaoVoteDetailsView from '../DaoVoteDetailsView';

// `vi.mock` factories are hoisted above the rest of this file, so any values they reference must
// themselves be declared via `vi.hoisted` (a plain top-level `const` would be a TDZ error).
const { SALE_ADDRESS, VOTE_ADDRESS } = vi.hoisted(() => ({
  SALE_ADDRESS: 'ct_1PnNLieJHnXKX3MShkSAMX9gcNgYEhxzqYqpQcqgFp75sWNWX',
  VOTE_ADDRESS: 'ct_21T9r7WsZuTuM8VvxmL53ZhUKZEq5qLFw1Efh41cBCxyWcLssz',
}));

let mockLink: string | undefined = 'https://example.com/proposal';

function makeVoteState() {
  return {
    author: 'ak_2CQXoTZR9Le3T9GkQPjuBSNSKw6NUFXk1cEsHXaBWmJyPnPYSA',
    close_height: 200n,
    create_height: 100n,
    metadata: {
      link: mockLink,
      description: 'A vote description.',
    },
  };
}

// Heavy child components are irrelevant to this scheme-validation regression test — stub them
// out so the test only depends on `DaoVoteDetailsView`'s own rendering of `metadata.link`.
vi.mock('@/features/bcl/components/TokenSummary', () => ({ default: () => null }));
vi.mock('@/features/dao/components/VoteSubject', () => ({ default: () => null }));
vi.mock('@/features/dao/components/VotersTable', () => ({ default: () => null }));
vi.mock('@/features/trending/components/TokenRanking', () => ({ TokenRanking: () => null }));
vi.mock('@/features/trending/components/TokenTradeCard', () => ({ default: () => null }));
vi.mock('@/@components/Address/AddressAvatarWithChainName', () => ({
  AddressAvatarWithChainName: () => null,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<any>('react-router-dom');
  return {
    ...actual,
    useParams: () => ({
      saleAddress: SALE_ADDRESS,
      voteAddress: VOTE_ADDRESS,
      voteId: '1',
    }),
  };
});

vi.mock('@/features/dao/hooks/useDaoVote', () => ({
  useDaoVote: () => ({
    hasTokenBalance: true,
    voteState: makeVoteState(),
    canVote: false,
    canRevokeVote: false,
    canWithdraw: false,
    canApply: false,
    voteYesPercentage: 0.5,
    userVoteOrLockedInfo: undefined,
    actionLoading: false,
    voteOption: vi.fn(),
    revokeVote: vi.fn(),
    withdraw: vi.fn(),
  }),
}));

vi.mock('@/hooks', () => ({
  useAeSdk: () => ({ currentBlockHeight: 100 }),
}));

// A plain async function (not `vi.fn()`) — the global `restoreMocks: true` vitest setting
// resets `vi.fn()` mocks (incl. their `mockResolvedValue`) before every test, which would wipe
// out an implementation configured only once here at module-factory time.
vi.mock('@/api/generated', () => ({
  TokensService: {
    findByAddress: async () => ({
      symbol: 'TEST',
      name: 'Test Token',
      address: SALE_ADDRESS,
      sale_address: SALE_ADDRESS,
    }),
  },
}));

function renderView() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DaoVoteDetailsView />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('DaoVoteDetailsView (HARDEN-05 scheme-validated poll link)', () => {
  it('renders a javascript: metadata.link as inert (no javascript: href in the DOM)', async () => {
    mockLink = 'javascript:alert(1)';
    renderView();

    await waitFor(() => expect(screen.queryByText(/loading/i)).toBeNull());

    expect(document.body.innerHTML).not.toContain('javascript:alert');
    const anchors = Array.from(document.querySelectorAll('a'));
    expect(
      anchors.every((a) => !(a.getAttribute('href') ?? '').toLowerCase().startsWith('javascript:')),
    ).toBe(true);
  });

  it('renders a data:text/html metadata.link as inert', async () => {
    mockLink = 'data:text/html,<script>alert(1)</script>';
    renderView();

    await waitFor(() => expect(screen.queryByText(/loading/i)).toBeNull());
    expect(document.body.innerHTML).not.toContain('data:text/html');
  });

  it('renders a legitimate https metadata.link with rel="noopener noreferrer"', async () => {
    mockLink = 'https://example.com/proposal';
    renderView();

    const anchor = await screen.findByText('View Proposal');
    expect(anchor).toHaveAttribute('href', 'https://example.com/proposal');
    expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
    expect(anchor).toHaveAttribute('target', '_blank');
  });
});
