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
  connectedAddress: null as string | null,
  addStaticAccount: vi.fn(),
}));

vi.mock('@/features/wallet/config', () => ({
  get INLINE_WALLET_ENABLED() { return mocks.inlineWalletEnabled; },
}));

vi.mock('@/utils/displayMode', () => ({
  isStandalone: () => mocks.standalone,
  isIOSWebKit: () => false,
}));

vi.mock('@/hooks', () => ({
  useAeSdk: () => ({ addStaticAccount: mocks.addStaticAccount }),
}));

vi.mock('@/hooks/usePasskeyConnect', () => ({
  usePasskeyConnect: () => ({
    available: true,
    state: 'idle',
    errorMsg: null,
    needsOnboarding: false,
    connectedAddress: mocks.connectedAddress,
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
    mocks.addStaticAccount.mockClear();
    mocks.connectedAddress = null;
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

describe('PasskeyConnectCard — a proven passkey actually connects', () => {
  beforeEach(() => {
    mocks.standalone = true;
    mocks.inlineWalletEnabled = true;
    mocks.addStaticAccount.mockClear();
    mocks.connectedAddress = null;
  });

  it('registers the account and notifies the caller once the vault has opened', async () => {
    // The dead end this pins: the ceremony ran, the card returned to idle, and
    // onConnected was never called — so a user with a passkey wallet could tap
    // Passkey, authenticate, and stay disconnected with no error shown.
    mocks.connectedAddress = 'ak_proven';
    const onConnected = vi.fn();

    await act(async () => { render(<PasskeyConnectCard onConnected={onConnected} />); });

    expect(mocks.addStaticAccount).toHaveBeenCalledWith('ak_proven');
    expect(onConnected).toHaveBeenCalledWith('ak_proven');
  });

  it('connects nobody while no passkey has been proven', async () => {
    const onConnected = vi.fn();

    await act(async () => { render(<PasskeyConnectCard onConnected={onConnected} />); });

    expect(mocks.addStaticAccount).not.toHaveBeenCalled();
    expect(onConnected).not.toHaveBeenCalled();
  });

  it('connects once even when the caller re-renders with a fresh callback', async () => {
    mocks.connectedAddress = 'ak_proven';
    const onConnected = vi.fn();
    // Inline on purpose: a fresh identity per render is what re-fires the effect.
    const view = render(<PasskeyConnectCard onConnected={(a) => onConnected(a)} />);
    await act(async () => {
      view.rerender(<PasskeyConnectCard onConnected={(a) => onConnected(a)} />);
    });

    expect(onConnected).toHaveBeenCalledTimes(1);
    expect(mocks.addStaticAccount).toHaveBeenCalledTimes(1);
  });
});
