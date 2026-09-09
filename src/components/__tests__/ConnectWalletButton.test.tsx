import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

/**
 * One entry point on every surface: the connect modal. The button used to route
 * an installed PWA straight into the inline onboarding overlay, which put a
 * second, different choice screen in front of the same three options the modal
 * already offers. Now the modal's wallet card is what differs by surface, and
 * this button never decides anything.
 */
const mocks = vi.hoisted(() => ({
  standalone: false,
  openModal: vi.fn(),
}));

vi.mock('@/utils/displayMode', () => ({
  isStandalone: () => mocks.standalone,
  isIOSWebKit: () => false,
}));

vi.mock('@/hooks', () => ({
  useAeSdk: () => ({ activeAccount: undefined }),
  useWalletConnect: () => ({ connectingWallet: false }),
  useModal: () => ({ openModal: mocks.openModal }),
}));

// eslint-disable-next-line import/first
import { ConnectWalletButton } from '../ConnectWalletButton';

describe('ConnectWalletButton — always the connect modal', () => {
  beforeEach(() => {
    mocks.openModal.mockClear();
    mocks.standalone = false;
  });

  it.each([
    ['a plain browser tab', false],
    ['an installed PWA', true],
  ])('opens the connect modal in %s', (_label, standalone) => {
    mocks.standalone = standalone;
    render(<ConnectWalletButton />);

    fireEvent.click(screen.getByRole('button'));

    expect(mocks.openModal).toHaveBeenCalledWith({ name: 'connect-wallet' });
  });
});
