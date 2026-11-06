export const FAKE_WALLET_INFO = {
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
 * Emulates the Superhero Wallet on the page: the extension content script or the in-app browser.
 * It announces presence on an interval and answers the aepp's JSON-RPC requests over window
 * messaging, wrapped in the to_aepp/to_waellet direction envelopes the SDK expects.
 */
export class FakeWallet {
  currentAddress: string;

  connectionOpens = 0;

  subscriptions = 0;

  /** Answers `address.subscribe` as a user declining the connect prompt. */
  rejectsSubscription = false;

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
      if (this.rejectsSubscription) {
        this.send({
          jsonrpc: '2.0',
          id: msg.id,
          method: msg.method,
          error: { code: 4, message: 'Operation rejected by user' },
        });
        return;
      }
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
