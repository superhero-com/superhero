import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { createShortsRefresh, subscribeShortsUpdates } from '../shorts-updates';

const mocks = vi.hoisted(() => ({
  updates: undefined as any,
  connect: undefined as any,
  stop: vi.fn(),
  stopConnect: vi.fn(),
  disconnect: vi.fn(),
  io: vi.fn(),
  listeners: {} as Record<string, (...args: any[]) => void>,
}));
vi.mock('@/config', () => ({ API_BASE_URL: 'https://api.example' }));
vi.mock('@/libs/WebSocketClient', () => ({
  default: {
    subscribeForShortsUpdates: (fn: any) => { mocks.updates = fn; return mocks.stop; },
    subscribeForConnection: (fn: any) => { mocks.connect = fn; return mocks.stopConnect; },
  },
}));
vi.mock('socket.io-client', () => ({ io: (...args: any[]) => mocks.io(...args) }));

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); mocks.listeners = {};
  mocks.io.mockImplementation(() => ({
    on: (name: string, fn: any) => { mocks.listeners[name] = fn; },
    off: (name: string) => { delete mocks.listeners[name]; },
    connect: vi.fn(),
    disconnect: mocks.disconnect,
  }));
});
afterEach(() => vi.useRealTimers());

describe('Shorts live invalidation', () => {
  it('uses the application socket, scopes updates, and unsubscribes without disconnecting it', () => {
    const refresh = vi.fn();
    const stop = subscribeShortsUpdates('https://api.example/', 'ae_uat', 'ct_short', refresh);
    mocks.updates({ network: 'ae_mainnet', contract: 'ct_short' });
    mocks.updates({ network: 'ae_uat', contract: 'ct_other' }); mocks.updates(null);
    expect(refresh).not.toHaveBeenCalled();
    mocks.updates({ network: 'ae_uat', contract: 'ct_short' }); mocks.connect();
    expect(refresh).toHaveBeenCalledTimes(2);
    stop(); expect(mocks.stop).toHaveBeenCalledOnce(); expect(mocks.stopConnect).toHaveBeenCalledOnce();
    expect(mocks.io).not.toHaveBeenCalled();
  });
  it('uses and cleans up a separate socket only when Shorts targets a separate API', () => {
    const refresh = vi.fn();
    const stop = subscribeShortsUpdates('https://shorts-api.example', 'ae_uat', 'ct_short', refresh);
    mocks.listeners['shorts-updated']({ network: 'ae_uat', contract: 'ct_short' }); mocks.listeners.connect();
    expect(refresh).toHaveBeenCalledTimes(2);
    stop(); expect(mocks.disconnect).toHaveBeenCalledOnce(); expect(mocks.listeners).toEqual({});
  });
  it('coalesces bursts and runs one trailing refresh without overlapping a slow response', async () => {
    let resolve: (() => void) | undefined;
    const refresh = vi.fn().mockImplementationOnce(() => new Promise<void>((done) => { resolve = done; })).mockResolvedValue(undefined);
    const queue = createShortsRefresh(refresh);
    queue.schedule(); queue.schedule(); await vi.advanceTimersByTimeAsync(200);
    expect(refresh).toHaveBeenCalledTimes(1);
    queue.schedule(); queue.schedule(); await vi.advanceTimersByTimeAsync(1000);
    expect(refresh).toHaveBeenCalledTimes(1);
    resolve!(); await vi.advanceTimersByTimeAsync(200);
    expect(refresh).toHaveBeenCalledTimes(2);
    queue.stop(); queue.schedule(); await vi.advanceTimersByTimeAsync(1000);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
  it('does not refetch after leaving the screen during an in-flight update', async () => {
    let resolve: (() => void) | undefined;
    const refresh = vi.fn(() => new Promise<void>((done) => { resolve = done; }));
    const queue = createShortsRefresh(refresh);
    queue.schedule(); await vi.advanceTimersByTimeAsync(200); queue.schedule(); queue.stop();
    resolve!(); await vi.advanceTimersByTimeAsync(500);
    expect(refresh).toHaveBeenCalledOnce();
  });
});
