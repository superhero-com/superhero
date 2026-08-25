import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

/**
 * Creation and signing must agree on where the inline wallet exists.
 *
 * `makeSigner` installs the in-page signer only in a standalone PWA, but this
 * card offered wallet creation in a plain browser tab — producing a real,
 * fundable account whose signatures were routed to the external wallet, which
 * never held that key. Same two conditions on both sides now.
 */
const mocks = vi.hoisted(() => ({
  standalone: true,
  inlineWalletEnabled: true,
  trigger: vi.fn(),
}));

vi.mock('@/features/wallet/config', () => ({
  get INLINE_WALLET_ENABLED() { return mocks.inlineWalletEnabled; },
}));

vi.mock('@/utils/displayMode', () => ({
  isStandalone: () => mocks.standalone,
  isIOSWebKit: () => false,
}));

vi.mock('@/hooks', () => ({
  useAeSdk: () => ({ addStaticAccount: vi.fn() }),
}));

vi.mock('@/hooks/usePasskeyConnect', () => ({
  usePasskeyConnect: () => ({
    available: true,
    state: 'idle',
    errorMsg: null,
    needsOnboarding: false,
    trigger: mocks.trigger,
    resetOnboarding: vi.fn(),
    loading: false,
  }),
}));

const { default: PasskeyConnectCard } = await import('../PasskeyConnectCard');

const mount = async () => {
  await act(async () => { render(<PasskeyConnectCard onConnected={vi.fn()} />); });
};

describe('PasskeyConnectCard — offered only where the wallet can actually sign', () => {
  beforeEach(() => {
    mocks.standalone = true;
    mocks.inlineWalletEnabled = true;
    mocks.trigger.mockClear();
  });

  it('offers the passkey option in an installed PWA', async () => {
    await mount();
    expect(screen.getByRole('button', { name: /passkey/i })).toBeInTheDocument();
  });

  it('renders nothing in a plain browser tab, where makeSigner returns the delegated account', async () => {
    mocks.standalone = false;
    const { container } = render(<PasskeyConnectCard onConnected={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the wallet is switched off, even in a PWA', async () => {
    mocks.inlineWalletEnabled = false;
    const { container } = render(<PasskeyConnectCard onConnected={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
