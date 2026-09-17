import { render, screen, fireEvent } from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import ProfileActionBar from '../ProfileActionBar';

const state = vi.hoisted(() => ({
  activeAccount: null as string | null,
  contractAddress: 'ct_config000000000000000000000000000000000000000000000' as string | null,
  connectWallet: vi.fn(async () => 'ak_me'),
}));

vi.mock('../../../../hooks/useAeSdk', () => ({ useAeSdk: () => ({ activeAccount: state.activeAccount }) }));
vi.mock('../../../../hooks/useWalletConnect', () => ({
  useWalletConnect: () => ({ connectWallet: state.connectWallet, connectingWallet: false }),
}));
vi.mock('../../../../hooks/useSocialGraph', () => ({
  useSocialGraphConfig: () => ({ data: { contract_address: state.contractAddress } }),
}));
vi.mock('../ProfileSocialActions', () => ({
  default: () => <div data-testid="social-actions-stub" />,
}));
vi.mock('@/utils/address', () => ({ copyToClipboard: vi.fn(async () => true) }));

const ADDR = 'ak_alice0000000000000000000000000000000000000000000000';

function renderBar(overrides: Partial<Parameters<typeof ProfileActionBar>[0]> = {}) {
  return render(
    <ProfileActionBar
      address={ADDR}
      ownProfile={false}
      onEdit={vi.fn()}
      onTip={vi.fn()}
      {...overrides}
    />,
  );
}

describe('ProfileActionBar', () => {
  beforeEach(() => {
    state.activeAccount = 'ak_me';
    state.contractAddress = 'ct_config000000000000000000000000000000000000000000000';
    state.connectWallet.mockClear();
  });

  it('shows the own-profile control: edit only — never tip, follow, share or overflow', () => {
    const onEdit = vi.fn();
    renderBar({ ownProfile: true, onEdit });
    fireEvent.click(screen.getByTestId('profile-edit-button'));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('profile-tip-button')).toBeNull();
    expect(screen.queryByTestId('social-actions-stub')).toBeNull();
    // Share and overflow moved to the cover — not in the action bar.
    expect(screen.queryByTestId('profile-share-button')).toBeNull();
    expect(screen.queryByTestId('profile-overflow-trigger')).toBeNull();
  });

  it('shows the viewer controls when a wallet is connected: follow actions and tip', () => {
    const onTip = vi.fn();
    renderBar({ onTip });
    expect(screen.getByTestId('social-actions-stub')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('profile-tip-button'));
    expect(onTip).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('profile-connect-to-follow')).toBeNull();
  });

  it('offers a connect prompt when the graph is configured but no wallet is connected', () => {
    state.activeAccount = null;
    renderBar();
    fireEvent.click(screen.getByTestId('profile-connect-to-follow'));
    expect(state.connectWallet).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('social-actions-stub')).toBeNull();
    // Tipping needs a wallet too, so the connect prompt stands in for it.
    expect(screen.queryByTestId('profile-tip-button')).toBeNull();
  });

  it('stays silent on follow when the social graph is unconfigured', () => {
    state.activeAccount = null;
    state.contractAddress = null;
    renderBar();
    expect(screen.queryByTestId('profile-connect-to-follow')).toBeNull();
    // Tip remains; the follow control simply does not appear.
    expect(screen.getByTestId('profile-tip-button')).toBeInTheDocument();
  });
});
