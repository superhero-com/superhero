/**
 * The app opened in the Superhero Wallet app's in-app browser: the page is not framed, the user
 * agent is a mobile one, and the wallet announces itself only after the page has loaded.
 * Runs the real AeSdkProvider, useWalletConnect and aepp-sdk RPC against a fake wallet.
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { createStore, Provider } from 'jotai';
import { MemoryRouter } from 'react-router-dom';
import {
  act, fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { Node } from '@aeternity/aepp-sdk';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { AeSdkProvider } from '@/context/AeSdkProvider';
import { useAeSdk } from '../useAeSdk';
import { useWalletConnect } from '../useWalletConnect';
import { FAKE_WALLET_INFO, FakeWallet } from './fakeWallet';

vi.hoisted(() => {
  // The in-app browser exposes its native bridge to the page before any script runs.
  (window as any).cordova_iab = { postMessage: () => {} };
  Object.defineProperty(window.navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36',
    configurable: true,
  });
});

vi.mock('@/libs/WebSocketClient', () => ({
  default: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribeForChannel: vi.fn(() => () => {}),
    isConnected: vi.fn(() => false),
  },
}));

const ACCOUNT = 'ak_46WPtSJH9Mc1rNbRaWo6k2v6Bm8dc1FuCFxS2n6gFo7M27Ucu';
/** The wallet injects its provider at `loadstop` and re-announces every 3 s. */
const WALLET_ANNOUNCE_DELAY_MS = 1000;

const WalletProbe = () => {
  const {
    aeSdk, initSdk, activeAccount, sdkInitialized,
  } = useAeSdk();
  const {
    attemptReconnection,
    connectWallet,
    walletInfo,
    connectingWallet,
    walletConnected,
  } = useWalletConnect();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    initSdk();
  }, [initSdk]);

  // Like a page unload: stop this test's aepp from answering the next test's wallet.
  useEffect(() => () => {
    try { aeSdk?.disconnectWallet(); } catch { /* not connected */ }
  }, [aeSdk]);

  useEffect(() => {
    if (!sdkInitialized) return;
    attemptReconnection();
  }, [
    sdkInitialized,
    activeAccount,
    walletInfo,
    connectingWallet,
    walletConnected,
    attemptReconnection,
  ]);

  return (
    <div>
      <button type="button" onClick={() => connectWallet()}>connect</button>
      <output data-testid="account">{activeAccount ?? 'none'}</output>
      <output data-testid="connected">{walletConnected ? 'yes' : 'no'}</output>
      <output data-testid="sdk">{sdkInitialized ? 'ready' : 'loading'}</output>
    </div>
  );
};

const renderApp = () => {
  const store = createStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <MemoryRouter>
        <AeSdkProvider>{children}</AeSdkProvider>
      </MemoryRouter>
    </Provider>
  );
  return render(<WalletProbe />, { wrapper });
};

const seedPersistedSession = () => {
  localStorage.setItem('account:activeAccount', JSON.stringify(ACCOUNT));
  localStorage.setItem('wallet:walletInfo', JSON.stringify(FAKE_WALLET_INFO));
};

describe('in the wallet in-app browser (integration)', () => {
  let fakeWallet: FakeWallet;
  let openWindow: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.spyOn(Node.prototype, 'getCurrentGeneration')
      .mockResolvedValue({ keyBlock: { height: 1 } } as any);
    openWindow = vi.spyOn(window, 'open').mockReturnValue(null);
    fakeWallet = new FakeWallet(ACCOUNT);
    fakeWallet.install();
    setTimeout(() => fakeWallet.startAnnouncing(), WALLET_ANNOUNCE_DELAY_MS);
  });

  afterEach(() => {
    fakeWallet.uninstall();
    localStorage.clear();
  });

  it('connects to the wallet that announces itself late, without a deep link', async () => {
    renderApp();
    await waitFor(() => expect(screen.getByTestId('sdk').textContent).toBe('ready'));
    fireEvent.click(screen.getByRole('button', { name: 'connect' }));

    await waitFor(
      () => expect(screen.getByTestId('connected').textContent).toBe('yes'),
      { timeout: 8000 },
    );
    expect(screen.getByTestId('account').textContent).toBe(ACCOUNT);
    expect(openWindow).not.toHaveBeenCalled();
  });

  it('re-establishes a persisted session after a reload', async () => {
    seedPersistedSession();
    renderApp();

    await waitFor(
      () => expect(screen.getByTestId('connected').textContent).toBe('yes'),
      { timeout: 8000 },
    );
    expect(fakeWallet.connectionOpens).toBe(1);
  });

  // A deep-link signing session can't reach the wallet from here.
  it('drops a persisted session the wallet does not take back', async () => {
    seedPersistedSession();
    fakeWallet.rejectsSubscription = true;
    renderApp();

    await waitFor(() => expect(fakeWallet.subscriptions).toBe(1), { timeout: 8000 });
    await waitFor(() => expect(screen.getByTestId('account').textContent).toBe('none'));
    await act(() => new Promise((resolve) => { setTimeout(resolve, 100); }));
    expect(screen.getByTestId('connected').textContent).toBe('no');
    expect([null, 'undefined']).toContain(localStorage.getItem('account:activeAccount'));
    expect([null, 'undefined']).toContain(localStorage.getItem('wallet:walletInfo'));
    expect(openWindow).not.toHaveBeenCalled();
  });
});
