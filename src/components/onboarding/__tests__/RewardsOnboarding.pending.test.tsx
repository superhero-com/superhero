import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { X_LINK_CHANGES_STORAGE_KEY, clearConfirmedXLinks } from '@/utils/confirmedXLink';
import RewardsOnboarding from '../RewardsOnboarding';

const OWNER = 'ak_owner';

const mockAeSdk = { activeAccount: OWNER };
vi.mock('../../../hooks/useAeSdk', () => ({ useAeSdk: () => mockAeSdk }));

// The account record has not caught up with the link yet.
const mockReward = {
  status: { x_username: null },
  statusLoading: false,
  statusUnavailable: false,
  isXLinked: false,
  isOnboardingPaid: false,
  onboardingComplete: false,
};
vi.mock('../../../hooks/useXPostingReward', () => ({ useXPostingReward: () => mockReward }));

const renderCard = () => render(
  <MemoryRouter>
    <RewardsOnboarding />
  </MemoryRouter>,
);

describe('RewardsOnboarding while an X link change is on its way', () => {
  beforeEach(() => { clearConfirmedXLinks(); });
  afterEach(() => { clearConfirmedXLinks(); });

  it('offers "Connect X" when nothing is pending', () => {
    renderCard();
    expect(screen.getByRole('button', { name: /connect x/i })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the link on its way, even after a reload, instead of offering it again', () => {
    window.localStorage.setItem(X_LINK_CHANGES_STORAGE_KEY, JSON.stringify({
      [OWNER]: {
        kind: 'link', txHash: 'th_link', username: null, startedAt: Date.now() - 30_000,
      },
    }));
    renderCard();

    expect(screen.getByRole('status')).toHaveTextContent('Linking your X account…');
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /connect x/i })).not.toBeInTheDocument();
  });
});
