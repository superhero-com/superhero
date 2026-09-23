import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

type MockSocket = {
  listeners: Record<string, (payload: any) => void>;
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  emit: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
};

const socketMocks = vi.hoisted(() => ({
  ioMock: vi.fn(),
  sockets: [] as MockSocket[],
}));

vi.mock('socket.io-client', () => ({
  io: (...args: any[]) => socketMocks.ioMock(...args),
}));

const createSocket = (): MockSocket => {
  const listeners: Record<string, (payload: any) => void> = {};
  return {
    listeners,
    connect: vi.fn(),
    disconnect: vi.fn(),
    emit: vi.fn(),
    off: vi.fn(),
    on: vi.fn((event: string, callback: (payload: any) => void) => {
      listeners[event] = callback;
    }),
  };
};

describe('WebSocketClient', () => {
  beforeEach(() => {
    vi.resetModules();
    socketMocks.sockets.length = 0;
    socketMocks.ioMock.mockReset();
    socketMocks.ioMock.mockImplementation(() => {
      const socket = createSocket();
      socketMocks.sockets.push(socket);
      return socket;
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete window.__SUPERCONFIG__;
  });

  it.each([
    ['ae_mainnet', 'https://api.superhero.com'],
    ['ae_uat', 'https://testnet.api.dev.tokensale.org'],
  ])('uses the same API as REST for %s', async (network, expected) => {
    vi.stubEnv('VITE_NETWORK', network);
    vi.stubEnv('VITE_SUPERHERO_API_URL', '');
    const { API_BASE_URL } = await import('@/config');
    const client = (await import('../WebSocketClient')).default;
    client.connect();
    expect(API_BASE_URL).toBe(expected);
    expect(socketMocks.ioMock).toHaveBeenCalledWith(API_BASE_URL, { autoConnect: false });
  });

  it('uses the local API override for realtime updates and reconnects', async () => {
    vi.stubEnv('VITE_SUPERHERO_API_URL', 'http://127.0.0.1:3300/');
    window.__SUPERCONFIG__ = { SUPERHERO_API_URL: 'https://api.example' };
    const { API_BASE_URL } = await import('@/config');
    const client = (await import('../WebSocketClient')).default;
    client.connect();
    client.connect();
    expect(API_BASE_URL).toBe('http://127.0.0.1:3300');
    expect(socketMocks.ioMock).toHaveBeenNthCalledWith(1, API_BASE_URL, { autoConnect: false });
    expect(socketMocks.ioMock).toHaveBeenNthCalledWith(2, API_BASE_URL, { autoConnect: false });
  });

  it('uses runtime API configuration when no build override is set', async () => {
    vi.stubEnv('VITE_SUPERHERO_API_URL', '');
    window.__SUPERCONFIG__ = { SUPERHERO_API_URL: 'https://runtime-api.example/' };
    const { API_BASE_URL } = await import('@/config');
    const client = (await import('../WebSocketClient')).default;
    client.connect();
    expect(API_BASE_URL).toBe('https://runtime-api.example');
    expect(socketMocks.ioMock).toHaveBeenCalledWith(API_BASE_URL, { autoConnect: false });
  });

  it('routes token history events to both targeted and global subscribers', async () => {
    const client = (await import('../WebSocketClient')).default;
    const targetedSubscriber = vi.fn();
    const globalSubscriber = vi.fn();

    client.connect('wss://socket.example');
    const socket = socketMocks.sockets[0];
    const unsubscribe = client.subscribeForTokenHistories('sale-1', targetedSubscriber);
    client.subscribeForTransactions(globalSubscriber);

    socket.listeners['token-history']({ sale_address: 'sale-1', hash: 'th_1' });

    expect(targetedSubscriber).toHaveBeenCalledWith({ sale_address: 'sale-1', hash: 'th_1' });
    expect(globalSubscriber).toHaveBeenCalledWith({ sale_address: 'sale-1', hash: 'th_1' });

    unsubscribe();
    socket.listeners['token-history']({ sale_address: 'sale-1', hash: 'th_2' });

    expect(targetedSubscriber).toHaveBeenCalledTimes(1);
    expect(globalSubscriber).toHaveBeenCalledTimes(2);
  });
  it('routes graph updates and reconnect events through the existing socket', async () => {
    const client = (await import('../WebSocketClient')).default;
    const graph = vi.fn(), reconnect = vi.fn();
    const stop = client.subscribeForSocialGraphUpdates(graph);
    const stopConnect = client.subscribeForConnection(reconnect);
    client.connect('wss://socket.example');
    const socket = socketMocks.sockets[0];
    const event = { network: 'ae_mainnet', contract: 'ct_graph', accounts: ['ak_target'] };
    socket.listeners.connect(undefined);
    socket.listeners['social-graph-updated'](event);
    expect(graph).toHaveBeenCalledWith(event);
    expect(reconnect).toHaveBeenCalledOnce();
    stop(); stopConnect();
    socket.listeners.connect(undefined);
    socket.listeners['social-graph-updated'](event);
    expect(graph).toHaveBeenCalledOnce();
    expect(reconnect).toHaveBeenCalledOnce();
  });

  it('disconnects the previous socket before reconnecting', async () => {
    const client = (await import('../WebSocketClient')).default;

    client.connect('wss://socket.example/first');
    const firstSocket = socketMocks.sockets[0];

    client.connect('wss://socket.example/second');
    const secondSocket = socketMocks.sockets[1];

    expect(firstSocket.disconnect).toHaveBeenCalledTimes(1);
    expect(secondSocket.connect).toHaveBeenCalledTimes(1);
  });

  it('ignores malformed payloads and clears socket state on disconnect', async () => {
    const client = (await import('../WebSocketClient')).default;
    const tokenCreatedSubscriber = vi.fn();

    client.connect('wss://socket.example');
    const socket = socketMocks.sockets[0];
    client.subscribeToNewTokenSales(tokenCreatedSubscriber);

    expect(() => socket.listeners['token-created'](null)).not.toThrow();
    expect(() => socket.listeners['token-created'](undefined)).not.toThrow();
    expect(tokenCreatedSubscriber).not.toHaveBeenCalled();

    client.disconnect();

    expect(socket.disconnect).toHaveBeenCalledTimes(1);
    expect(client.socketClient).toBeUndefined();
  });
});
