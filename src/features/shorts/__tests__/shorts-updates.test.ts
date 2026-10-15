import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { createShortsRefresh, subscribeShortsUpdates } from '../shorts-updates';

const mocks = vi.hoisted(() => ({
  disconnect: vi.fn(),
  connectSocket: vi.fn(),
  io: vi.fn(),
  listeners: {} as Record<string, (...args: any[]) => void>,
}));
vi.mock('socket.io-client', () => ({ io: (...args: any[]) => mocks.io(...args) }));

beforeEach(() => {
  vi.clearAllMocks(); vi.useFakeTimers(); mocks.listeners = {};
  vi.spyOn(Math, 'random').mockReturnValue(1);
  mocks.io.mockImplementation(() => ({
    on: (name: string, fn: any) => { mocks.listeners[name] = fn; },
    off: (name: string) => { delete mocks.listeners[name]; },
    connect: mocks.connectSocket,
    disconnect: mocks.disconnect,
  }));
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('Shorts live invalidation', () => {
  it('uses a dedicated endpoint even on the main API, scopes updates, and cleans up', () => {
    const refresh = vi.fn();
    const stop = subscribeShortsUpdates('https://api.example/', 'ae_uat', 'ct_short', refresh);
    expect(mocks.io).toHaveBeenCalledWith('https://api.example/shorts', expect.objectContaining({
      path: '/shorts/socket.io', forceNew: true, transports: ['websocket'], reconnection: false,
    }));
    mocks.listeners['shorts-updated']({ network: 'ae_mainnet', contract: 'ct_short' });
    mocks.listeners['shorts-updated']({ network: 'ae_uat', contract: 'ct_other' });
    mocks.listeners['shorts-updated'](null);
    expect(refresh).not.toHaveBeenCalled();
    mocks.listeners['shorts-updated']({ network: 'ae_uat', contract: 'ct_short' });
    mocks.listeners.connect();
    expect(refresh).toHaveBeenCalledTimes(2);
    stop(); expect(mocks.disconnect).toHaveBeenCalledOnce(); expect(mocks.listeners).toEqual({});
  });
  it('preserves reverse-proxy path prefixes without changing the namespace', () => {
    const stop = subscribeShortsUpdates('https://other-api.example/gateway/', 'ae_uat', 'ct_short', vi.fn());
    expect(mocks.io).toHaveBeenCalledWith('https://other-api.example/shorts', expect.objectContaining({ path: '/gateway/shorts/socket.io' }));
    stop(); expect(mocks.disconnect).toHaveBeenCalledOnce();
  });
  it('backs off admission failures and server disconnects, then refreshes on reconnect', async () => {
    const refresh = vi.fn();
    const stop = subscribeShortsUpdates('https://api.example', 'ae_uat', 'ct_short', refresh);
    expect(mocks.connectSocket).toHaveBeenCalledTimes(1);
    const retryAfter = async (delay: number) => {
      const before = mocks.connectSocket.mock.calls.length;
      mocks.listeners.connect_error(new Error('busy')); mocks.listeners.disconnect('transport close');
      await vi.advanceTimersByTimeAsync(delay - 1);
      expect(mocks.connectSocket).toHaveBeenCalledTimes(before);
      await vi.advanceTimersByTimeAsync(1);
      expect(mocks.connectSocket).toHaveBeenCalledTimes(before + 1);
    };
    await retryAfter(2000);
    await retryAfter(4000);
    await retryAfter(8000);
    await retryAfter(16000);
    await retryAfter(30000);
    await retryAfter(30000);
    mocks.listeners.connect(); expect(refresh).toHaveBeenCalledOnce();
    mocks.listeners.disconnect('io server disconnect');
    await vi.advanceTimersByTimeAsync(2000); expect(mocks.connectSocket).toHaveBeenCalledTimes(8);
    stop();
  });
  it('jitters retries so recovering clients do not all reconnect together', async () => {
    vi.mocked(Math.random).mockReturnValue(0);
    const stop = subscribeShortsUpdates('https://api.example', 'ae_uat', 'ct_short', vi.fn());
    mocks.listeners.connect_error(new Error('busy'));
    await vi.advanceTimersByTimeAsync(1499); expect(mocks.connectSocket).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1); expect(mocks.connectSocket).toHaveBeenCalledTimes(2);
    stop();
  });
  it('cancels retries and late invalidations when leaving or switching deployment', async () => {
    const refresh = vi.fn();
    const stop = subscribeShortsUpdates('https://api.example', 'ae_uat', 'ct_short', refresh);
    const late = mocks.listeners['shorts-updated'];
    mocks.listeners.connect_error(new Error('offline'));
    stop();
    late({ network: 'ae_uat', contract: 'ct_short' });
    await vi.advanceTimersByTimeAsync(60000);
    expect(mocks.connectSocket).toHaveBeenCalledOnce(); expect(refresh).not.toHaveBeenCalled();
  });
  it('coalesces bursts and runs one trailing refresh without overlapping a slow response', async () => {
    let resolve: (() => void) | undefined;
    const refresh = vi.fn()
      .mockImplementationOnce(() => new Promise<void>((done) => { resolve = done; }))
      .mockResolvedValue(undefined);
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
