import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import RewardsProgram from '../RewardsProgram';

let mockReward: any;

vi.mock('../../../../../hooks/useXPostingReward', () => ({ useXPostingReward: () => mockReward }));
vi.mock('../../../../../hooks/useAeSdk', () => ({ useAeSdk: () => ({ activeAccount: 'ak_owner' }) }));
// Fetches and polls on its own; covered by RewardHistory.test.
vi.mock('../RewardHistory', () => ({ RewardHistory: () => null }));

// Defaults to a linked, onboarded account: the posting milestone is open.
const setReward = ({ streakDays = 0, rewardedPosts = 3, onboarded = true } = {}) => {
  mockReward = {
    status: { current_streak_days: streakDays, per_post_total_paid_count: rewardedPosts },
    referralLink: null,
    statusLoading: false,
    checkLoading: false,
    linkLoading: false,
    error: null,
    canCheck: true,
    nextCheckAt: null,
    fetchReferralLink: vi.fn(),
    runRewardCheck: vi.fn(),
    isXLinked: true,
    isOnboardingPaid: onboarded,
  };
};

const renderPage = () => render(
  <MemoryRouter>
    <RewardsProgram />
  </MemoryRouter>,
);

describe('RewardsProgram streak', () => {
  beforeEach(() => setReward());

  it('says there is no active streak while the posting milestone is open', () => {
    renderPage();

    expect(screen.getByText('No active streak. Post with your referral link to start one.')).toBeInTheDocument();
    expect(screen.queryByText(/Current streak/)).not.toBeInTheDocument();
  });

  it('shows the running streak instead once there is one', () => {
    setReward({ streakDays: 4 });
    renderPage();

    expect(screen.getByText('Current streak: 4/10 days')).toBeInTheDocument();
    expect(screen.queryByText(/No active streak/)).not.toBeInTheDocument();
  });

  it.each([
    ['locked', { onboarded: false }],
    ['completed', { rewardedPosts: 10 }],
  ])('says nothing about a missing streak while the milestone is %s', (_, reward) => {
    setReward(reward);
    renderPage();

    expect(screen.queryByText(/No active streak/)).not.toBeInTheDocument();
  });

  it('states the rule with the current UTC time and keeps that time current', () => {
    vi.useFakeTimers();
    // 07:45 on a UTC+8 morning still belongs to the previous UTC day.
    vi.setSystemTime(new Date('2026-10-01T07:45:30+08:00'));
    renderPage();

    expect(screen.getByText(/^Streak days follow UTC \(now 23:45 UTC\)\./)).toBeInTheDocument();

    act(() => { vi.advanceTimersByTime(30_000); });

    expect(screen.getByText(/\(now 23:46 UTC\)/)).toBeInTheDocument();
  });
});
