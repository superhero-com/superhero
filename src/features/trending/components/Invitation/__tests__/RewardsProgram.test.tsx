import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

import RewardsProgram from '../RewardsProgram';

const useXPostingRewardMock = vi.fn();

vi.mock('@/hooks/useXPostingReward', () => ({
  useXPostingReward: () => useXPostingRewardMock(),
}));

vi.mock('@/hooks/useAeSdk', () => ({
  useAeSdk: () => ({ activeAccount: 'ak_wallet' }),
}));

const baseHook = {
  status: null as any,
  referralLink: null,
  statusLoading: false,
  statusUnavailable: false,
  statusErrorMessage: null as string | null,
  checkLoading: false,
  linkLoading: false,
  error: null as string | null,
  canCheck: true,
  nextCheckAt: null,
  fetchReferralLink: vi.fn(),
  runRewardCheck: vi.fn(),
  refresh: vi.fn(),
  isXLinked: false,
  isOnboardingPaid: false,
};

const renderProgram = () => render(
  <MemoryRouter>
    <RewardsProgram />
  </MemoryRouter>,
);

describe('RewardsProgram', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useXPostingRewardMock.mockReturnValue({ ...baseHook });
  });

  it('renders a failure reason and a retry, not a zeroed checklist, when the status read fails', () => {
    const refresh = vi.fn();
    useXPostingRewardMock.mockReturnValue({
      ...baseHook,
      statusUnavailable: true,
      status: null,
      refresh,
    });

    renderProgram();

    // The reason is shown...
    expect(screen.getByText(/couldn't load your rewards status/i)).toBeTruthy();
    // ...and the zeroed onboarding checklist is NOT rendered in its place.
    expect(screen.queryByText(/STEP 1 OF 2/i)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('prefers the API-reported reason when the failed read carries one', () => {
    useXPostingRewardMock.mockReturnValue({
      ...baseHook,
      statusUnavailable: true,
      status: null,
      statusErrorMessage: 'Rewards service is down for maintenance',
    });

    renderProgram();

    expect(screen.getByText('Rewards service is down for maintenance')).toBeTruthy();
  });

  it('surfaces a 200 status reason in the banner while still showing the page', () => {
    // Program env-disabled: the status read succeeds (200) but reports why no
    // reward was sent. The reason must reach the user, not be swallowed.
    useXPostingRewardMock.mockReturnValue({
      ...baseHook,
      status: { status: 'not_started', error: 'Posting rewards are temporarily unavailable.' },
      error: 'Posting rewards are temporarily unavailable.',
    });

    renderProgram();

    expect(screen.getByText('Posting rewards are temporarily unavailable.')).toBeTruthy();
  });

  it('shows the server-settled per-post total as the earned figure, not count × current tier', () => {
    // 2 posts settled at 20 AE total (aettos), but the current tier is 30 AE.
    // count × current-tier would read 60 AE; the settled figure is 20 AE.
    useXPostingRewardMock.mockReturnValue({
      ...baseHook,
      isOnboardingPaid: true,
      status: {
        status: 'paid',
        per_post_total_paid_count: 2,
        per_post_total_paid_aettos: '20000000000000000000',
        tier_amount_ae: 30,
      },
      isXLinked: true,
    });

    renderProgram();

    expect(screen.getByText('20 AE Earned')).toBeTruthy();
    expect(screen.queryByText(/60 AE Earned/)).toBeNull();
  });
});
