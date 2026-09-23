import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { subscribeSocialGraphQueries } from '../socialGraphUpdates';

const socket = vi.hoisted(() => ({ update: undefined as any, connect: undefined as any, stop: vi.fn(), stopConnection: vi.fn() }));
vi.mock('../WebSocketClient', () => ({ default: {
  subscribeForSocialGraphUpdates: (fn: any) => { socket.update = fn; return socket.stop; },
  subscribeForConnection: (fn: any) => { socket.connect = fn; return socket.stopConnection; },
} }));
afterEach(() => vi.clearAllMocks());

describe('social graph socket cache updates', () => {
  it('invalidates the affected counts and relationship, resets page cursors, and keeps other scopes isolated', async () => {
    const client = new QueryClient();
    const counts = ['SocialGraphCounts', 'ae_mainnet', 'api', 'ct_graph', 'ak_b'];
    const relationship = ['SocialGraphService.relationship', 'ae_mainnet', 'api', 'ct_graph', 'ak_a', 'ak_b'];
    const list = ['SocialGraphConnections', 'ae_mainnet', 'api', 'ct_graph', 'followers', 'ak_b', ''];
    const others = [
      ['SocialGraphCounts', 'ae_uat', 'api', 'ct_graph', 'ak_b'],
      ['SocialGraphCounts', 'ae_mainnet', 'other-api', 'ct_graph', 'ak_b'],
      ['SocialGraphCounts', 'ae_mainnet', 'api', 'ct_other', 'ak_b'],
      ['SocialGraphCounts', 'ae_mainnet', 'api', 'ct_graph', 'ak_c'],
    ];
    [counts, relationship, list, ...others].forEach((key) => client.setQueryData(key, { old: true }));
    const stop = subscribeSocialGraphQueries(client, 'ae_mainnet', 'api');
    socket.update({ network: 'ae_mainnet', contract: 'ct_graph', generation: '2', accounts: ['ak_a', 'ak_b'] });
    expect(client.getQueryState(counts)?.isInvalidated).toBe(true);
    expect(client.getQueryState(relationship)?.isInvalidated).toBe(true);
    expect(client.getQueryData(list)).toBeUndefined();
    others.forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(false));
    stop(); client.clear();
  });
  it('shares one listener per query client and refreshes after reconnect without timers', () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    const counts = ['SocialGraphCounts', 'ae_mainnet', 'api', 'ct_graph', 'ak_b'];
    client.setQueryData(counts, { followers: 1 });
    const first = subscribeSocialGraphQueries(client, 'ae_mainnet', 'api');
    const second = subscribeSocialGraphQueries(client, 'ae_mainnet', 'api');
    vi.advanceTimersByTime(60000);
    expect(client.getQueryState(counts)?.isInvalidated).toBe(false);
    first();
    expect(socket.stop).not.toHaveBeenCalled();
    socket.connect();
    expect(client.getQueryState(counts)?.isInvalidated).toBe(true);
    second();
    expect(socket.stop).toHaveBeenCalledOnce();
    expect(socket.stopConnection).toHaveBeenCalledOnce();
    client.clear(); vi.useRealTimers();
  });
});
