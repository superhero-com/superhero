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

vi.mock('@/@components/Address/AddressAvatarWithChainName', () => ({
  AddressAvatarWithChainName: ({ address }: { address: string }) => <span>{address.slice(0, 8)}</span>,
}));
vi.mock('@/features/shared/components', () => ({ LivePriceFormatter: () => <span>9,306 AE</span> }));
vi.mock('@/components/ConnectWalletButton', () => ({
  ConnectWalletButton: ({ label }: { label: string }) => <button type="button">{label}</button>,
}));
vi.mock('@/hooks', () => ({
  useAccount: () => ({ activeAccount: mockAccount, balance: (1000n * E18).toString() }),
}));
vi.mock('@/features/dao/hooks/useDao', () => ({
  useDao: () => ({
    tokenMetaInfo: { symbol: 'WC', decimals: 18n },
    addVote: async (metadata: any) => { created.push(metadata); return { voteId: 7n, address: 'ct_new' }; },
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
    expect(within(items[0]).getByRole('link', { name: 'Open vote #1' }))
      .toHaveAttribute('href', `/trends/dao/${SALE}/vote/1/ct_vote1`);
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
  const fillPayout = async () => {
    renderAt(`/trends/dao/${SALE}?create=1`);
    fireEvent.change(await screen.findByLabelText('How much AE?'), { target: { value: '150' } });
    fireEvent.change(screen.getByLabelText('Who receives the AE?'), { target: { value: AK } });
    fireEvent.change(screen.getByLabelText('Why should holders say yes?'), { target: { value: 'Fund the meetup' } });
    fireEvent.click(screen.getByRole('button', { name: /Review vote/ }));
  };

  it('uses plain labels per type, not contract names', async () => {
    renderAt(`/trends/dao/${SALE}?create=1`);
    expect(await screen.findByRole('radio', { name: /Send AE from the treasury/ })).toBeChecked();
    expect(screen.getByRole('radio', { name: /Add a moderator/ })).toBeInTheDocument();
    expect(screen.queryByText('VotePayoutAmount')).toBeNull();
  });

  it('keeps validation and shows errors next to the fields', async () => {
    renderAt(`/trends/dao/${SALE}?create=1`);
    fireEvent.click(await screen.findByRole('button', { name: /Review vote/ }));
    expect(screen.getByText('Enter an amount.')).toBeInTheDocument();
    expect(screen.getByText('Enter an account address.')).toBeInTheDocument();
    expect(screen.getByText('Tell holders why.')).toBeInTheDocument();
    expect(screen.getByLabelText('How much AE?')).toHaveAttribute('aria-invalid', 'true');
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
  });

  it('can go back and edit without losing the details', async () => {
    await fillPayout();
    fireEvent.click(await screen.findByRole('button', { name: 'Edit details' }));
    await waitFor(() => expect(screen.getByLabelText('How much AE?')).toHaveValue('150'));
  });
});
