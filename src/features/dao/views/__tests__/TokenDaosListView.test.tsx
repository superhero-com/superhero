import React from 'react';
import {
  fireEvent, render, screen, waitFor, within,
} from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import TokenDaosListView from '../TokenDaosListView';

const { SALE, DAO, AK } = vi.hoisted(() => ({
  SALE: 'ct_1PnNLieJHnXKX3MShkSAMX9gcNgYEhxzqYqpQcqgFp75sWNWX',
  DAO: 'ct_21T9r7WsZuTuM8VvxmL53ZhUKZEq5qLFw1Efh41cBCxyWcLssz',
  AK: 'ak_46WPtSJH9Mc1rNbRaWo6k2v6Bm8dc1FuCFxS2n6gFo7M27Ucu',
}));
const E18 = 10n ** 18n;

const vote = (id: number, status: string, yes: bigint, subject: any) => ({
  id: BigInt(id),
  address: `ct_vote${id}`,
  applied: status === 'applied',
  status,
  state: {
    author: AK,
    close_height: 200n,
    create_height: 100n,
    metadata: { subject, description: `Proposal ${id}`, link: '' },
    vote_state: new Map([[true, yes], [false, 0n]]),
    vote_accounts: new Map(),
  },
});

let mockVotes: any[] = [];
let mockAccount: string | undefined;
const created: any[] = [];
// Which SDK and sale each vote was created through.
const createdVia: { sdk: unknown; sale: string }[] = [];
let createError: Error | undefined;

vi.mock('@/@components/Address/AddressAvatarWithChainName', () => ({
  AddressAvatarWithChainName: ({ address }: { address: string }) => <span>{address.slice(0, 8)}</span>,
}));
vi.mock('@/features/shared/components', () => ({ LivePriceFormatter: () => <span>9,306 AE</span> }));
vi.mock('@/components/ConnectWalletButton', () => ({
  ConnectWalletButton: ({ label }: { label: string }) => <button type="button">{label}</button>,
}));
vi.mock('@/hooks', () => ({
  useAccount: () => ({ activeAccount: mockAccount, balance: (1000n * E18).toString() }),
  useAeSdk: () => ({ sdk: 'wallet-sdk' }),
}));
vi.mock('bctsl-sdk', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  initFallBack: async (sdk: unknown, sale: string) => ({
    checkAndGetDAO: async () => ({
      addVote: async (metadata: any) => {
        if (createError) throw createError;
        created.push(metadata);
        createdVia.push({ sdk, sale });
        return { voteId: 7n, address: 'ct_new' };
      },
    }),
  }),
}));
vi.mock('@/features/dao/hooks/useDaoVotes', () => ({
  daoVotesQueryKey: (a?: string) => ['dao-votes', a],
  useDaoVotes: () => ({
    votes: mockVotes,
    openCount: mockVotes.filter((v) => v.status === 'open').length,
    data: { voteTimeout: 960, tokenSupply: 100n * E18, votes: mockVotes },
    isLoading: false,
    isError: false,
    refetch: () => undefined,
    currentBlockHeight: 150,
  }),
}));
vi.mock('@/api/generated', () => ({
  TokensService: {
    findByAddress: async () => ({
      name: 'WORD-CRAFT',
      symbol: 'WC',
      sale_address: SALE,
      dao_address: DAO,
      dao_balance: (9306n * E18).toString(),
      holders_count: 316,
    }),
  },
}));

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/trends/dao/:saleAddress" element={<TokenDaosListView />} />
          <Route path="/trends/dao/:saleAddress/vote/:voteId/:voteAddress" element={<div>vote page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  mockAccount = undefined;
  created.length = 0;
  createdVia.length = 0;
  createError = undefined;
  mockVotes = [
    vote(1, 'open', 40n * E18, { VotePayoutAmount: [AK, 1500n * E18] }),
    vote(0, 'failed', 1n * E18, { AddModerator: [AK] }),
  ];
});

describe('TokenDaosListView', () => {
  it('lists votes in plain words with status, bars and counts', async () => {
    renderAt(`/trends/dao/${SALE}`);
    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('#WORD-CRAFT DAO');
    expect(screen.getByTestId('dao-open-votes')).toHaveTextContent('1');
    const items = within(screen.getByRole('region', { name: 'Votes' })).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('Send 1,500 AE from the treasury to')).toBeInTheDocument();
    expect(within(items[0]).getByText('Open')).toBeInTheDocument();
    expect(within(items[0]).getByRole('progressbar', { name: '40% of all tokens voted, 10% needed' })).toBeInTheDocument();
    expect(within(items[1]).getByText('Not passed')).toBeInTheDocument();
    expect(within(items[0]).getByRole('link', { name: 'Vote #1' }))
      .toHaveAttribute('href', `/trends/dao/${SALE}/vote/1/ct_vote1`);
    expect(within(items[1]).getByRole('link', { name: 'See result #0' }))
      .toHaveAttribute('href', `/trends/dao/${SALE}/vote/0/ct_vote0`);
  });

  it('shows an event funding vote with its event and the reason, not the raw line', async () => {
    const ev = vote(2, 'open', 40n * E18, { VotePayoutAmount: [AK, 300n * E18] });
    ev.state.metadata.description = 'Event: Superhero Meetup | Sofia | 2099-03-14\nVenue and snacks';
    mockVotes = [ev];
    renderAt(`/trends/dao/${SALE}`);
    const [item] = within(await screen.findByRole('region', { name: 'Votes' })).getAllByRole('listitem');
    expect(within(item).getByText('Fund Superhero Meetup: send 300 AE to')).toBeInTheDocument();
    expect(within(item).getByText('Event')).toBeInTheDocument();
    expect(within(item).getByText('Superhero Meetup · Sofia · Mar 14, 2099')).toBeInTheDocument();
    expect(within(item).getByText('Venue and snacks')).toBeInTheDocument();
    expect(within(item).queryByText(/Event: Superhero/)).toBeNull();
  });

  it('filters open and closed votes', async () => {
    renderAt(`/trends/dao/${SALE}`);
    fireEvent.click(await screen.findByRole('button', { name: /^Closed/ }));
    expect(within(screen.getByRole('region', { name: 'Votes' })).getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /^Closed/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('shows an empty state that leads to creating a vote', async () => {
    mockVotes = [];
    renderAt(`/trends/dao/${SALE}`);
    fireEvent.click(await screen.findByRole('button', { name: 'Create the first vote' }));
    expect(await screen.findByRole('heading', { name: 'Create a vote' })).toBeInTheDocument();
  });

  it('shows the contract rules, including the apply window from the DAO', async () => {
    renderAt(`/trends/dao/${SALE}`);
    expect(await screen.findByText('Passes with 55% Yes')).toBeInTheDocument();
    expect(screen.getByText('Open for about 14 days.')).toBeInTheDocument();
    expect(screen.getByText('Apply within about 2 days after it passes.')).toBeInTheDocument();
  });
});

describe('Create a vote', () => {
  const fillPayout = async (amount = '150') => {
    renderAt(`/trends/dao/${SALE}?create=1`);
    fireEvent.click(await screen.findByRole('radio', { name: /^Send AE from the treasury/ }));
    fireEvent.change(await screen.findByLabelText('How much AE?'), { target: { value: amount } });
    fireEvent.change(screen.getByLabelText('Who receives the AE?'), { target: { value: AK } });
    fireEvent.change(screen.getByLabelText('Why should holders say yes?'), { target: { value: 'Fund the meetup' } });
    fireEvent.click(screen.getByRole('button', { name: /Review vote/ }));
  };

  it('uses plain labels per type, not contract names', async () => {
    renderAt(`/trends/dao/${SALE}?create=1`);
    expect(await screen.findByRole('radio', { name: /^Fund an event/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /^Send AE from the treasury/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Add a moderator/ })).toBeInTheDocument();
    expect(screen.queryByText('VotePayoutAmount')).toBeNull();
  });

  it('keeps validation and shows errors next to the fields', async () => {
    renderAt(`/trends/dao/${SALE}?create=1`);
    fireEvent.click(await screen.findByRole('button', { name: /Review vote/ }));
    expect(screen.getByText('Enter the event name.')).toBeInTheDocument();
    expect(screen.getByText('Enter the city.')).toBeInTheDocument();
    expect(screen.getByText('Pick the event date.')).toBeInTheDocument();
    expect(screen.getByText('Enter an amount.')).toBeInTheDocument();
    expect(screen.getByText('Enter an account address.')).toBeInTheDocument();
    expect(screen.getByText('Tell holders why.')).toBeInTheDocument();
    expect(screen.getByLabelText('How much AE?')).toHaveAttribute('aria-invalid', 'true');
  });

  it.each([
    ['0.0001', 'Send 0.0001 AE from the treasury'],
    ['1.2345', 'Send 1.2345 AE from the treasury'],
  ])('reviews %s AE as the exact amount that is sent', async (amount, text) => {
    await fillPayout(amount);
    expect(await screen.findByText(text)).toBeInTheDocument();
  });

  it('asks for a wallet on review when none is connected', async () => {
    await fillPayout();
    expect(await screen.findByRole('heading', { name: 'Review and create' })).toBeInTheDocument();
    expect(screen.getByText('Send 150 AE from the treasury')).toBeInTheDocument();
    expect(screen.getByText('Creating this vote costs 555 AE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Connect wallet to create' })).toBeInTheDocument();
  });

  it('creates the vote after the fee is acknowledged and opens it', async () => {
    mockAccount = AK;
    await fillPayout();
    const submit = await screen.findByRole('button', { name: 'Create vote · 555 AE' });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(submit);
    expect(await screen.findByText('vote page')).toBeInTheDocument();
    expect(created).toEqual([{
      subject: { VotePayoutAmount: [AK, 150n * E18] },
      description: 'Fund the meetup',
      link: '',
    }]);
    // In the DAO that owns this sale, signed with the wallet's SDK.
    expect(createdVia).toEqual([{ sdk: 'wallet-sdk', sale: SALE }]);
  });

  it('funds an event: the event rides at the top of the description', async () => {
    mockAccount = AK;
    renderAt(`/trends/dao/${SALE}?create=1`);
    fireEvent.change(await screen.findByLabelText('Event name'), { target: { value: 'Superhero Meetup' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Sofia' } });
    fireEvent.change(screen.getByLabelText('Event date'), { target: { value: '2099-03-14' } });
    fireEvent.change(screen.getByLabelText('How much AE?'), { target: { value: '150' } });
    fireEvent.change(screen.getByLabelText('Who receives the AE?'), { target: { value: AK } });
    fireEvent.change(screen.getByLabelText('Why should holders say yes?'), { target: { value: 'Venue and snacks' } });
    fireEvent.click(screen.getByRole('button', { name: /Review vote/ }));
    expect(await screen.findByText('Send 150 AE from the treasury to fund the event')).toBeInTheDocument();
    expect(screen.getByText(/Superhero Meetup · Sofia · /)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Create vote · 555 AE' }));
    expect(await screen.findByText('vote page')).toBeInTheDocument();
    expect(created).toEqual([{
      subject: { VotePayoutAmount: [AK, 150n * E18] },
      description: 'Event: Superhero Meetup | Sofia | 2099-03-14\nVenue and snacks',
      link: '',
    }]);
  });

  it('can go back and edit without losing the details', async () => {
    await fillPayout();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
    await waitFor(() => expect(screen.getByLabelText('How much AE?')).toHaveValue('150'));
  });

  it('stays on review and says why when the contract refuses the vote', async () => {
    mockAccount = AK;
    createError = new Error('Invocation failed: "ADD_VOTE_TOKEN_HOLDER_MISSMATCH"');
    await fillPayout();
    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: 'Create vote · 555 AE' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('You need more tokens to create a vote here.');
    expect(screen.getByRole('heading', { name: 'Review and create' })).toBeInTheDocument();
    expect(screen.queryByText('vote page')).toBeNull();
  });
});
