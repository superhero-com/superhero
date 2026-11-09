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

// Per-test overrides of the hook result (status, the account's position, balance, actions).
let mockHook: Record<string, any> = {};
let mockAccount: string | undefined;
const calls: string[] = [];

vi.mock('@/features/dao/hooks/useDaoVote', () => ({
  useDaoVote: () => ({
    voteState: makeVoteState(),
    status: 'open',
    tally: {
      yes: 60n, no: 40n, total: 100n, yesPercent: 60, turnoutPercent: 4, meetsRules: false,
    },
    position: undefined,
    actions: {
      canVote: !!mockAccount, canRevoke: false, canWithdraw: false, canApply: false,
    },
    voteTimeout: 960,
    tokenSymbol: 'TEST',
    tokenDecimals: 18,
    userTokenBalance: 5n * 10n ** 18n,
    daoLoaded: true,
    actionLoading: false,
    actionError: undefined,
    voteOption: async (option: boolean) => { calls.push(`vote:${option}`); },
    revokeVote: async () => { calls.push('revoke'); },
    withdraw: async () => { calls.push('withdraw'); },
    applyVote: async () => { calls.push('apply'); },
    ...mockHook,
  }),
}));

vi.mock('@/hooks', () => ({
  useAeSdk: () => ({ currentBlockHeight: 100, activeAccount: mockAccount }),
}));

vi.mock('@/components/ConnectWalletButton', () => ({
  ConnectWalletButton: ({ label }: { label: string }) => <button type="button">{label}</button>,
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

beforeEach(() => {
  mockHook = {};
  mockAccount = undefined;
  calls.length = 0;
  mockLink = 'https://example.com/proposal';
});

describe('DaoVoteDetailsView (scheme-validated poll link)', () => {
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

const ACCOUNT = 'ak_46WPtSJH9Mc1rNbRaWo6k2v6Bm8dc1FuCFxS2n6gFo7M27Ucu';

describe('DaoVoteDetailsView ballot', () => {
  it('shows Yes/No choices, the lock notice and a connect button without a wallet', async () => {
    renderView();
    expect(await screen.findByRole('radio', { name: /Yes, do it/ })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /No, keep things as they are/ })).toBeInTheDocument();
    expect(screen.getByText(/Voting locks your #Test Token tokens until the vote ends/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect wallet to vote' })).toBeInTheDocument();
  });

  it('shows the pass rules as progress bars with what is needed', async () => {
    renderView();
    expect(await screen.findByRole('progressbar', { name: '60% yes, 55% needed' })).toHaveAttribute('aria-valuenow', '60');
    expect(screen.getByRole('progressbar', { name: '4% of all tokens voted, 10% needed' })).toBeInTheDocument();
    expect(screen.getByText('Not passing yet: more holders need to vote.')).toBeInTheDocument();
  });

  it('asks a connected account without tokens to get some first', async () => {
    mockAccount = ACCOUNT;
    mockHook = { userTokenBalance: 0n };
    renderView();
    expect(await screen.findByText('You need #Test Token tokens to vote.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Vote / })).toBeNull();
  });

  it('votes Yes with the chosen option', async () => {
    mockAccount = ACCOUNT;
    renderView();
    const submit = await screen.findByRole('button', { name: 'Choose Yes or No' });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: /Yes, do it/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Vote Yes' }));
    await waitFor(() => expect(calls).toEqual(['vote:true']));
  });

  it('lets a voter take the vote back while it is open', async () => {
    mockAccount = ACCOUNT;
    mockHook = {
      position: { amount: 5n * 10n ** 18n, agreed: true, withdrawn: false },
      actions: {
        canVote: false, canRevoke: true, canWithdraw: false, canApply: false,
      },
    };
    renderView();
    expect(await screen.findByText('You voted Yes with 5 TEST.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Take vote back' }));
    await waitFor(() => expect(calls).toEqual(['revoke']));
  });

  it('offers withdraw after the vote closed and apply when it passed', async () => {
    mockAccount = ACCOUNT;
    mockHook = {
      status: 'passed',
      position: { amount: 5n * 10n ** 18n, agreed: false, withdrawn: false },
      actions: {
        canVote: false, canRevoke: false, canWithdraw: true, canApply: true,
      },
    };
    renderView();
    fireEvent.click(await screen.findByRole('button', { name: 'Withdraw 5 TEST' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply the result' }));
    await waitFor(() => expect(calls).toEqual(['withdraw', 'apply']));
  });

  it('says the vote could not be loaded instead of loading forever', async () => {
    mockHook = { voteState: undefined, loadError: true };
    renderView();
    expect(await screen.findByRole('alert')).toHaveTextContent('This vote could not be loaded');
    expect(screen.queryByText('Loading…')).toBeNull();
  });

  it('shows a plain message when the wallet request fails', async () => {
    mockAccount = ACCOUNT;
    mockHook = { actionError: new Error('Invocation failed: VOTER_ALREADY_VOTED') };
    renderView();
    expect(await screen.findByRole('alert')).toHaveTextContent('You have already voted.');
  });
});
