import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { TokenVotingTab } from '../TokenVotingTab';

const SALE = 'ct_1PnNLieJHnXKX3MShkSAMX9gcNgYEhxzqYqpQcqgFp75sWNWX';
const AK = 'ak_46WPtSJH9Mc1rNbRaWo6k2v6Bm8dc1FuCFxS2n6gFo7M27Ucu';
let mockVotes: any[] = [];

vi.mock('@/@components/Address/AddressAvatarWithChainName', () => ({
  AddressAvatarWithChainName: () => <span>author</span>,
}));
vi.mock('@/features/dao/hooks/useDaoVotes', () => ({
  useDaoVotes: () => ({
    votes: mockVotes,
    openCount: mockVotes.filter((v) => v.status === 'open').length,
    data: { voteTimeout: 960, tokenSupply: 1000n, votes: mockVotes },
    isLoading: false,
    isError: false,
    currentBlockHeight: 150,
  }),
}));

const token = {
  name: 'WORD-CRAFT', symbol: 'WC', sale_address: SALE, dao_address: 'ct_dao',
} as any;

const renderTab = () => render(<MemoryRouter><TokenVotingTab token={token} /></MemoryRouter>);

beforeEach(() => { mockVotes = []; });

describe('TokenVotingTab', () => {
  it('links to the DAO page and to creating a vote', () => {
    renderTab();
    expect(screen.getByRole('heading', { name: '#WORD-CRAFT votes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open the DAO' })).toHaveAttribute('href', `/trends/dao/${SALE}`);
    expect(screen.getByRole('link', { name: /Create a vote/ })).toHaveAttribute('href', `/trends/dao/${SALE}?create=1`);
    expect(screen.getByText('No votes yet')).toBeInTheDocument();
  });

  it('shows open votes with the count', () => {
    mockVotes = [{
      id: 3n,
      address: 'ct_v3',
      applied: false,
      status: 'open',
      state: {
        author: AK,
        close_height: 300n,
        metadata: { subject: { AddModerator: [AK] }, description: 'Add Ana', link: '' },
        vote_state: new Map([[true, 10n], [false, 0n]]),
        vote_accounts: new Map(),
      },
    }];
    renderTab();
    expect(screen.getByText('Open votes: 1. Holders vote with their tokens.')).toBeInTheDocument();
    expect(screen.getByText('Make a moderator:')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open vote #3' })).toHaveAttribute('href', `/trends/dao/${SALE}/vote/3/ct_v3`);
  });
});
