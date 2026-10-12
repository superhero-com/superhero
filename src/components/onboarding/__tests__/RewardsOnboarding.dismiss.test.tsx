import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';
import { REWARDS_ONBOARDING_DISMISSED_KEY_PREFIX } from '@/hooks/useRewardsOnboardingDismissal';
import RewardsOnboarding from '../RewardsOnboarding';

const mockAeSdk: { activeAccount: string | undefined } = { activeAccount: undefined };
vi.mock('../../../hooks/useAeSdk', () => ({ useAeSdk: () => mockAeSdk }));

// Nothing done yet, so the card has a reason to show.
const mockReward = {
  status: { x_username: null },
  statusLoading: false,
  statusUnavailable: false,
  isXLinked: false,
  isOnboardingPaid: false,
  onboardingComplete: false,
};
vi.mock('../../../hooks/useXPostingReward', () => ({ useXPostingReward: () => mockReward }));

const TITLE = 'Set up your Superhero account';
const DISMISS = { name: 'Hide setup steps' };

// Dismissals made this page-load are kept in module memory, so each case uses
// an account no other case has touched.
let accountSeq = 0;
const freshAccount = () => {
  accountSeq += 1;
  return `ak_dismiss_${accountSeq}`;
};
const storageKey = (address: string) => `${REWARDS_ONBOARDING_DISMISSED_KEY_PREFIX}${address}`;

const renderCard = () => render(
  <MemoryRouter>
    <RewardsOnboarding />
  </MemoryRouter>,
);

describe('RewardsOnboarding dismissal', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('closes on dismiss and remembers it for that account', () => {
    const account = freshAccount();
    mockAeSdk.activeAccount = account;
    renderCard();
    expect(screen.getByText(TITLE)).toBeInTheDocument();

    act(() => { screen.getByRole('button', DISMISS).click(); });

    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
    expect(window.localStorage.getItem(storageKey(account))).toBe('1');
  });

  it('stays closed after a reload for the account that dismissed it', () => {
    const account = freshAccount();
    window.localStorage.setItem(storageKey(account), '1');
    mockAeSdk.activeAccount = account;
    renderCard();

    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
  });

  it('still shows for another account on the same browser', () => {
    const first = freshAccount();
    const second = freshAccount();
    mockAeSdk.activeAccount = first;
    const { rerender } = renderCard();
    act(() => { screen.getByRole('button', DISMISS).click(); });
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();

    mockAeSdk.activeAccount = second;
    rerender(
      <MemoryRouter>
        <RewardsOnboarding />
      </MemoryRouter>,
    );

    expect(screen.getByText(TITLE)).toBeInTheDocument();
    expect(window.localStorage.getItem(storageKey(second))).toBeNull();
  });

  it('closes the feed and rail copies together', () => {
    mockAeSdk.activeAccount = freshAccount();
    render(
      <MemoryRouter>
        <RewardsOnboarding variant="feed" />
        <RewardsOnboarding variant="rail" />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(TITLE)).toHaveLength(2);

    act(() => { screen.getAllByRole('button', DISMISS)[1].click(); });

    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
  });

  it('shows the card when storage cannot be read', () => {
    const account = freshAccount();
    window.localStorage.setItem(storageKey(account), '1');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });
    mockAeSdk.activeAccount = account;
    renderCard();

    expect(screen.getByText(TITLE)).toBeInTheDocument();
  });

  it('still closes for this visit when storage cannot be written', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    mockAeSdk.activeAccount = freshAccount();
    renderCard();

    act(() => { screen.getByRole('button', DISMISS).click(); });

    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
  });
});
