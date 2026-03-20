import {
  beforeEach, describe, expect, it, vi,
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
