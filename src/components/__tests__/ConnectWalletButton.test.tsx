import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

/**
 * Routing only: in an installed PWA this button IS the wallet, so it opens
 * onboarding directly; in a browser tab it opens the connect modal, where the
 * passkey card sits alongside the external-wallet and agent options. The tab
 * case must keep opening the modal — routing straight to onboarding there would
 * take the external-wallet and agent choices away.
 */
const mocks = vi.hoisted(() => ({
  standalone: false,
  openModal: vi.fn(),
  addStaticAccount: vi.fn(),
}));

vi.mock('@/utils/displayMode', () => ({
  isStandalone: () => mocks.standalone,
  isIOSWebKit: () => false,
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

describe('ConnectWalletButton — isStandalone routes it', () => {
  beforeEach(() => {
    mocks.openModal.mockClear();
    mocks.addStaticAccount.mockClear();
    mocks.standalone = false;
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
