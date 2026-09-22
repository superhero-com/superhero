import React from 'react';
import {
  fireEvent, render, screen, within,
} from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import type { XRewardHistoryItem } from '@/api/backend';
import { RewardHistory } from '../RewardHistory';

let mockQuery: any;
const mockUseXRewardHistory = vi.fn();
// What the chain says, per transaction hash. Absent = not read (yet).
let mockChain: Record<string, any> = {};
const mockUseOnChainPayout = vi.fn();

vi.mock('../../../../../hooks/useXRewardHistory', () => ({
  useXRewardHistory: (...args: any[]) => {
    mockUseXRewardHistory(...args);
    return mockQuery;
  },
}));

vi.mock('../../../../../hooks/useOnChainPayout', () => ({
  useOnChainPayout: (txHash: string | null, recipient: string) => {
    mockUseOnChainPayout(txHash, recipient);
    return { data: txHash ? mockChain[txHash] : undefined };
  },
}));

const ADDRESS = 'ak_owner';
const EXPLORER = 'https://aescan.io/transactions';

const item = (overrides: Partial<XRewardHistoryItem>): XRewardHistoryItem => ({
  kind: 'per_post',
  status: 'paid',
  amount_ae: '10',
  amount_recorded: true,
  tx_hash: null,
  explorer_url: null,
  occurred_at: '2026-07-02T12:00:00.000Z',
  post_day: null,
  streak_days: null,
  invite_count: null,
  ...overrides,
});

const loaded = (items: XRewardHistoryItem[], truncated = false) => {
  mockQuery = {
    data: { items, truncated }, isPending: false, isError: false,
  };
};

const rows = () => within(screen.getByRole('list')).getAllByRole('listitem');

describe('RewardHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChain = {};
    loaded([]);
  });

  it('lists each payout with what it was for, how much, and whether it arrived', () => {
    loaded([
      item({
        kind: 'invite_milestone',
        amount_ae: '100',
        amount_recorded: false,
        invite_count: 10,
        tx_hash: 'th_invite',
        explorer_url: `${EXPLORER}/th_invite`,
      }),
      item({
        kind: 'streak_bonus',
        amount_ae: '50',
        streak_days: 10,
        tx_hash: 'th_streak',
        explorer_url: `${EXPLORER}/th_streak`,
      }),
      item({
        kind: 'per_post', amount_ae: '1.5', post_day: '2026-07-03', status: 'pending',
      }),
      item({
        kind: 'onboarding',
        amount_ae: '50',
        amount_recorded: false,
        tx_hash: 'th_welcome',
        explorer_url: `${EXPLORER}/th_welcome`,
        occurred_at: '2026-06-24T00:00:00.000Z',
      }),
    ]);
    render(<RewardHistory address={ADDRESS} />);

    expect(mockUseXRewardHistory).toHaveBeenCalledWith(ADDRESS);
    expect(screen.getByRole('heading', { name: 'Reward history' })).toBeInTheDocument();

    const [invite, streak, post, welcome] = rows();
    expect(invite).toHaveTextContent('Invite reward');
    expect(invite).toHaveTextContent('10 friends joined with your link');
    expect(invite).toHaveTextContent('+100 AE');
    expect(invite).toHaveTextContent('Paid');

    expect(streak).toHaveTextContent('Streak bonus');
    expect(streak).toHaveTextContent('10 days of posting in a row');
    expect(streak).toHaveTextContent('+50 AE');

    expect(post).toHaveTextContent('Post reward');
    // Dated by the post that earned it, not by when the row was written.
    expect(post).toHaveTextContent('Jul 3, 2026');
    expect(post).toHaveTextContent('+1.5 AE');
    expect(post).toHaveTextContent('On its way');

    expect(welcome).toHaveTextContent('Welcome reward');
    expect(welcome).toHaveTextContent('Jun 24, 2026');
  });

  it('links every settled payout to its transaction on æScan, in a new tab', () => {
    loaded([
      item({ tx_hash: 'th_paid', explorer_url: `${EXPLORER}/th_paid` }),
    ]);
    render(<RewardHistory address={ADDRESS} />);

    const link = screen.getByRole('link', { name: /post reward.*view on æscan/i });
    expect(link).toHaveAttribute('href', `${EXPLORER}/th_paid`);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('does not link a payout that has no transaction yet', () => {
    loaded([item({ status: 'pending' })]);
    render(<RewardHistory address={ADDRESS} />);

    expect(rows()[0]).toHaveTextContent('On its way');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows a failed send as retrying, since it is retried automatically', () => {
    loaded([item({ status: 'failed' })]);
    render(<RewardHistory address={ADDRESS} />);

    expect(rows()[0]).toHaveTextContent('Retrying');
    expect(rows()[0]).not.toHaveTextContent(/failed/i);
  });

  it('explains what comes next when X is linked but nothing is paid yet', () => {
    render(<RewardHistory address={ADDRESS} showEmpty />);
    expect(screen.getByText(/no rewards yet/i)).toBeInTheDocument();
  });

  it('stays out of the way for a wallet with nothing to show', () => {
    const { container } = render(<RewardHistory address={ADDRESS} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not flash a loading card at a wallet with nothing to show', () => {
    mockQuery = { data: undefined, isPending: true, isError: false };
    const { container } = render(<RewardHistory address={ADDRESS} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('hides itself when the history cannot be loaded, e.g. an older API', () => {
    mockQuery = { data: undefined, isPending: false, isError: true };
    const { container } = render(<RewardHistory address={ADDRESS} showEmpty />);
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps showing what it has when a later refresh fails', () => {
    // react-query keeps the last data when a refetch errors. Hiding on the
    // error alone would blank the list mid-read on one failed poll.
    mockQuery = {
      data: { items: [item({ tx_hash: 'th_kept', explorer_url: `${EXPLORER}/th_kept` })], truncated: false },
      isPending: false,
      isError: true,
    };
    render(<RewardHistory address={ADDRESS} />);

    expect(rows()).toHaveLength(1);
    expect(screen.getByRole('link')).toHaveAttribute('href', `${EXPLORER}/th_kept`);
  });

  it('shows what the chain recorded once it confirms a payout', () => {
    // The API only estimates the welcome reward: the amount is the configured
    // value and the date is when X was linked. The chain has the real ones.
    loaded([item({
      kind: 'onboarding',
      amount_ae: '50',
      amount_recorded: false,
      occurred_at: '2026-06-24T00:00:00.000Z',
      tx_hash: 'th_welcome',
      explorer_url: `${EXPLORER}/th_welcome`,
    })]);
    mockChain.th_welcome = {
      mined: true, verified: true, amountAe: '0.05', time: '2026-07-01T09:30:00.000Z',
    };
    render(<RewardHistory address={ADDRESS} />);

    const [row] = rows();
    expect(mockUseOnChainPayout).toHaveBeenCalledWith('th_welcome', ADDRESS);
    expect(row).toHaveTextContent('+0.05 AE');
    expect(row).not.toHaveTextContent('+50 AE');
    expect(row).toHaveTextContent('Jul 1, 2026');
    expect(row).toHaveTextContent('Verified');
    expect(within(row).getByTitle('Paid, and confirmed on the blockchain')).toBeInTheDocument();
  });

  it('settles a payout the API still shows as on its way once its block lands', () => {
    loaded([item({
      status: 'pending', tx_hash: 'th_broadcast', explorer_url: `${EXPLORER}/th_broadcast`,
    })]);
    mockChain.th_broadcast = {
      mined: true, verified: true, amountAe: '10', time: '2026-07-02T12:00:00.000Z',
    };
    render(<RewardHistory address={ADDRESS} />);

    expect(rows()[0]).toHaveTextContent('Verified');
    expect(rows()[0]).not.toHaveTextContent('On its way');
  });

  it("keeps the API's data when the hash is not a payment to this wallet", () => {
    loaded([item({
      amount_ae: '10', tx_hash: 'th_elsewhere', explorer_url: `${EXPLORER}/th_elsewhere`,
    })]);
    mockChain.th_elsewhere = {
      mined: true, verified: false, amountAe: null, time: null,
    };
    render(<RewardHistory address={ADDRESS} />);

    expect(rows()[0]).toHaveTextContent('+10 AE');
    expect(rows()[0]).toHaveTextContent('Paid');
    expect(rows()[0]).not.toHaveTextContent('Verified');
  });

  it('shows the API data while the chain has not answered', () => {
    loaded([item({ amount_ae: '10', tx_hash: 'th_slow', explorer_url: `${EXPLORER}/th_slow` })]);
    render(<RewardHistory address={ADDRESS} />);

    expect(rows()[0]).toHaveTextContent('+10 AE');
    expect(rows()[0]).toHaveTextContent('Paid');
  });

  it('renders nothing without a wallet', () => {
    loaded([item({})]);
    const { container } = render(<RewardHistory address={null} showEmpty />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the latest five and expands to the rest', () => {
    loaded(Array.from({ length: 8 }, (_, i) => item({
      tx_hash: `th_${i}`, explorer_url: `${EXPLORER}/th_${i}`,
    })));
    render(<RewardHistory address={ADDRESS} />);

    expect(rows()).toHaveLength(5);
    fireEvent.click(screen.getByRole('button', { name: 'Show all (8)' }));
    expect(rows()).toHaveLength(8);
    fireEvent.click(screen.getByRole('button', { name: 'Show less' }));
    expect(rows()).toHaveLength(5);
  });

  it('says when older payouts are not shown', () => {
    loaded(Array.from({ length: 100 }, (_, i) => item({ tx_hash: `th_${i}` })), true);
    render(<RewardHistory address={ADDRESS} />);

    expect(screen.getByText('100+')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show all (100)' }));
    expect(screen.getByText('Showing your latest 100 payments.')).toBeInTheDocument();
  });
});
