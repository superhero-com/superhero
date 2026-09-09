import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

/**
 * Two conditions: the flag decides whether the inline wallet exists at all,
 * isStandalone() only where an enabled one routes. Previously isStandalone() alone
 * fronted wallet creation, reachable from any browser tab on mainnet.
 */
const mocks = vi.hoisted(() => ({
  standalone: false,
  inlineWalletEnabled: true,
  openModal: vi.fn(),
  addStaticAccount: vi.fn(),
}));

vi.mock('@/utils/displayMode', () => ({
  isStandalone: () => mocks.standalone,
  isIOSWebKit: () => false,
}));

vi.mock('@/features/wallet/config', () => ({
  get INLINE_WALLET_ENABLED() { return mocks.inlineWalletEnabled; },
}));

vi.mock('@/hooks', () => ({
  useAeSdk: () => ({ activeAccount: undefined, addStaticAccount: mocks.addStaticAccount }),
  useWalletConnect: () => ({ connectingWallet: false }),
  useModal: () => ({ openModal: mocks.openModal }),
}));

// Stub the lazy onboarding surface so the test never pulls in the crypto stack.
vi.mock('@/features/wallet/components/WalletOnboarding', () => ({
  default: () => <div data-testid="inline-onboarding">Set up your wallet</div>,
}));

// eslint-disable-next-line import/first
import { ConnectWalletButton } from '../ConnectWalletButton';

describe('ConnectWalletButton — flag gates the wallet, isStandalone routes it', () => {
  beforeEach(() => {
    mocks.openModal.mockClear();
    mocks.addStaticAccount.mockClear();
    mocks.standalone = false;
    mocks.inlineWalletEnabled = true;
  });

  it('opens the external connect modal in a standalone PWA when the flag is OFF', async () => {
    // Strongest point for the gate: a PWA is where onboarding would otherwise open.
    mocks.inlineWalletEnabled = false;
    mocks.standalone = true;
    render(<ConnectWalletButton />);

    fireEvent.click(screen.getByRole('button'));

    expect(mocks.openModal).toHaveBeenCalledWith({ name: 'connect-wallet' });
    expect(screen.queryByTestId('inline-onboarding')).not.toBeInTheDocument();
  });

  it('opens the external connect modal in a plain browser tab', () => {
    mocks.standalone = false;
    render(<ConnectWalletButton />);

    fireEvent.click(screen.getByRole('button'));

    expect(mocks.openModal).toHaveBeenCalledWith({ name: 'connect-wallet' });
    expect(screen.queryByTestId('inline-onboarding')).not.toBeInTheDocument();
  });

  it('opens the inline onboarding flow in a standalone PWA', async () => {
    mocks.standalone = true;
    render(<ConnectWalletButton />);

    fireEvent.click(screen.getByRole('button'));

    expect(mocks.openModal).not.toHaveBeenCalled();
    expect(await screen.findByTestId('inline-onboarding')).toBeInTheDocument();
  });
});
