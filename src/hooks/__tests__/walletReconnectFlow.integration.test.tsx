/**
 * Integration coverage for the wallet reconnect flow after a page refresh.
 *
 * Runs the REAL stack end to end: AeSdkProvider (real AeSdkAepp), useWalletConnect,
 * jotai persistence over real localStorage, and the real aepp-sdk RPC machinery
 * (walletDetector, BrowserWindowMessageConnection, RpcClient). The wallet side is
 * a fake extension speaking the actual JSON-RPC postMessage protocol — the same
 * surface the Superhero extension content script exposes to the page.
 *
 * Only two seams are stubbed:
 *  - WebSocketClient (would open real socket.io connections)
 *  - Node.prototype.getCurrentGeneration (would hit the chain node over HTTP)
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { createStore, Provider } from 'jotai';
import { MemoryRouter } from 'react-router-dom';
import {
  act, render, screen, waitFor,
} from '@testing-library/react';
import { Node } from '@aeternity/aepp-sdk';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { AeSdkProvider } from '@/context/AeSdkProvider';
import { useAeSdk } from '../useAeSdk';
import { useWalletConnect } from '../useWalletConnect';

vi.mock('@/libs/WebSocketClient', () => ({
  default: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    subscribeForChannel: vi.fn(() => () => {}),
    isConnected: vi.fn(() => false),
  },
}));

// Valid base58check-encoded account addresses (32-byte payloads); the static
// SDK's selectAccount decodes addresses, so these must be well-formed.
const ACCOUNT_A = 'ak_46WPtSJH9Mc1rNbRaWo6k2v6Bm8dc1FuCFxS2n6gFo7M27Ucu';
const ACCOUNT_B = 'ak_4yo5ZzPDUKCsoucyTX2GfktgoyjxM9cjFUWqkiQsUJrWLdLS7';

const FAKE_WALLET_INFO = {
  id: 'fake-extension',
  name: 'Fake Wallet',
  networkId: 'ae_uat',
  origin: window.origin,
  type: 'extension' as const,
};

type RpcMessage = {
  jsonrpc: string;
  id?: number;
  method: string;
  params?: any;
};

/**
 * Emulates the Superhero extension content script: announces presence on an
 * interval and answers the aepp's JSON-RPC requests over window messaging,
 * wrapped in the to_aepp/to_waellet direction envelopes the SDK expects.
 */
class FakeWalletExtension {
  currentAddress: string;

  connectionOpens = 0;

  subscriptions = 0;

  private announceInterval: ReturnType<typeof setInterval> | null = null;

  constructor(currentAddress: string) {
    this.currentAddress = currentAddress;
  }

  private listener = (event: MessageEvent) => {
    const wrapped = event.data;
    if (typeof wrapped !== 'object' || wrapped?.type !== 'to_waellet') return;
    const msg = wrapped.data as RpcMessage;
    if (msg?.jsonrpc !== '2.0') return;

    if (msg.method === 'connection.open') {
      this.connectionOpens += 1;
      this.stopAnnouncing();
      this.respond(msg.id!, msg.method, FAKE_WALLET_INFO);
      return;
    }
    if (msg.method === 'address.subscribe') {
      this.subscriptions += 1;
      this.respond(msg.id!, msg.method, {
        subscription: [msg.params?.value ?? 'connected'],
        address: this.addressState(),
      });
    }
  };

  install() {
    window.addEventListener('message', this.listener);
  }

  uninstall() {
    this.stopAnnouncing();
    window.removeEventListener('message', this.listener);
  }

  /** The real content script re-announces itself periodically after page load. */
  startAnnouncing(intervalMs = 25) {
    this.announce();
    this.announceInterval ??= setInterval(() => this.announce(), intervalMs);
  }

  stopAnnouncing() {
    if (this.announceInterval) {
      clearInterval(this.announceInterval);
      this.announceInterval = null;
    }
  }

  announce() {
    this.send({
      jsonrpc: '2.0',
      method: 'connection.announcePresence',
      params: FAKE_WALLET_INFO,
    });
  }

  /** Simulates the user switching accounts inside the extension. */
  switchAccount(address: string) {
    this.currentAddress = address;
    this.send({
      jsonrpc: '2.0',
      method: 'address.update',
      params: this.addressState(),
    });
  }

  private addressState() {
    return { current: { [this.currentAddress]: {} }, connected: {} };
  }

  private respond(id: number, method: string, result: unknown) {
    this.send({
      jsonrpc: '2.0', id, method, result,
    });
  }

  // jsdom's window.postMessage delivers events with source=null / origin='',
  // which the SDK's origin and source filters drop. Dispatch a fully formed
  // MessageEvent instead, exactly as the browser delivers content-script posts.
  // eslint-disable-next-line class-methods-use-this
  private send(data: unknown) {
    window.dispatchEvent(new MessageEvent('message', {
      data: { type: 'to_aepp', data },
      origin: window.origin,
      source: window,
    }));
  }
}

/**
 * Mirrors App.tsx's boot wiring (SDK init once + hydration-aware reconnection
 * effect). App itself pulls in routing, i18n and backend calls, which is why the
 * trigger is replicated here instead of rendering the full App.
 */
const ReconnectProbe = () => {
  const { initSdk, activeAccount, sdkInitialized } = useAeSdk();
  const {
    attemptReconnection,
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
      <output data-testid="account">{activeAccount ?? 'none'}</output>
      <output data-testid="connected">{walletConnected ? 'yes' : 'no'}</output>
    </div>
  );
};

const renderFlow = () => {
  const store = createStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>
      <MemoryRouter>
        <AeSdkProvider>{children}</AeSdkProvider>
      </MemoryRouter>
    </Provider>
  );
  return render(<ReconnectProbe />, { wrapper });
};

const seedPersistedSession = ({ withWalletInfo }: { withWalletInfo: boolean }) => {
  localStorage.setItem('account:activeAccount', JSON.stringify(ACCOUNT_A));
  if (withWalletInfo) {
    localStorage.setItem('wallet:walletInfo', JSON.stringify(FAKE_WALLET_INFO));
  }
};

describe('wallet reconnect flow after refresh (integration)', () => {
  let fakeWallet: FakeWalletExtension | null = null;

  beforeEach(() => {
    vi.spyOn(Node.prototype, 'getCurrentGeneration')
      .mockResolvedValue({ keyBlock: { height: 1 } } as any);
  });

  afterEach(() => {
    fakeWallet?.uninstall();
    fakeWallet = null;
  });

  it('re-establishes the extension RPC session and keeps catching address updates', async () => {
    seedPersistedSession({ withWalletInfo: true });
    fakeWallet = new FakeWalletExtension(ACCOUNT_A);
    fakeWallet.install();
    fakeWallet.startAnnouncing();

    renderFlow();

    await waitFor(
      () => expect(screen.getByTestId('connected').textContent).toBe('yes'),
      { timeout: 8000 },
    );
    expect(screen.getByTestId('account').textContent).toBe(ACCOUNT_A);
    expect(fakeWallet.connectionOpens).toBe(1);
    expect(fakeWallet.subscriptions).toBe(1);
    // The live wallet's info replaced the persisted copy.
    expect(JSON.parse(localStorage.getItem('wallet:walletInfo')!))
      .toMatchObject({ id: FAKE_WALLET_INFO.id, name: FAKE_WALLET_INFO.name });

    // The regression this flow guards: after a refresh, switching accounts in
    // the extension must reach the app through the SDK's onAddressChange.
    act(() => {
      fakeWallet!.switchAccount(ACCOUNT_B);
    });
    await waitFor(() => expect(screen.getByTestId('account').textContent).toBe(ACCOUNT_B));
  });

  it('leaves the wallet alone for static sessions without persisted walletInfo', async () => {
    seedPersistedSession({ withWalletInfo: false });
    fakeWallet = new FakeWalletExtension(ACCOUNT_A);
    fakeWallet.install();
    fakeWallet.startAnnouncing();

    renderFlow();

    // The static (read-only) account is restored...
    await waitFor(() => expect(screen.getByTestId('account').textContent).toBe(ACCOUNT_A));
    // ...but no RPC connection is ever opened, even though the extension announces.
    await act(() => new Promise((resolve) => { setTimeout(resolve, 250); }));
    expect(fakeWallet.connectionOpens).toBe(0);
    expect(screen.getByTestId('connected').textContent).toBe('no');
  });

  it('keeps the restored session intact while the extension does not answer', async () => {
    seedPersistedSession({ withWalletInfo: true });
    // No fake wallet at all — the detector scan stays pending.

    renderFlow();

    await waitFor(() => expect(screen.getByTestId('account').textContent).toBe(ACCOUNT_A));
    await act(() => new Promise((resolve) => { setTimeout(resolve, 300); }));

    // Silent reconnection must not degrade the restored read-only session.
    expect(screen.getByTestId('account').textContent).toBe(ACCOUNT_A);
    expect(screen.getByTestId('connected').textContent).toBe('no');
    expect(localStorage.getItem('account:activeAccount')).toBe(JSON.stringify(ACCOUNT_A));
    expect(JSON.parse(localStorage.getItem('wallet:walletInfo')!))
      .toMatchObject({ id: FAKE_WALLET_INFO.id });
  });
});
