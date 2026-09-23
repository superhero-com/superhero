import type { QueryClient } from '@tanstack/react-query';
import websocket from './WebSocketClient';

// Several profile hooks share one listener and the application's existing socket.
type SharedSubscription = { users: number; stop: () => void };
const subscriptions = new WeakMap<QueryClient, Map<string, SharedSubscription>>();

export function subscribeSocialGraphQueries(client: QueryClient, network: string, api: string) {
  let entries = subscriptions.get(client);
  if (!entries) {
    entries = new Map();
    subscriptions.set(client, entries);
  }
  const key = JSON.stringify([network, api]);
  let entry = entries.get(key);
  if (!entry) {
    const refresh = (event?: { network: string; contract: string; accounts?: string[] }) => {
      if (event && event.network !== network) return;
      const scoped = (query: { queryKey: readonly unknown[] }) => {
        const [kind, queryNetwork, queryApi, contract, ...args] = query.queryKey;
        if (queryNetwork !== network || queryApi !== api) return false;
        if (kind === 'SocialGraphService.getConfig') return true;
        if (!['SocialGraphCounts', 'SocialGraphConnections', 'SocialGraphService.relationship'].includes(String(kind))) return false;
        if (event && contract !== event.contract) return false;
        return !event?.accounts || args.some((arg) => event.accounts!.includes(String(arg)));
      };
      // A fork or removal can invalidate previously loaded page cursors. Start
      // active lists at page one and discard inactive lists' old continuations.
      client.resetQueries({ predicate: (q) => q.queryKey[0] === 'SocialGraphConnections' && scoped(q) });
      client.invalidateQueries({ predicate: (q) => q.queryKey[0] !== 'SocialGraphConnections' && scoped(q) });
    };
    const stopUpdates = websocket.subscribeForSocialGraphUpdates(refresh);
    const stopConnection = websocket.subscribeForConnection(() => refresh());
    entry = { users: 0, stop: () => { stopUpdates(); stopConnection(); } };
    entries.set(key, entry);
  }
  entry.users += 1;
  return () => {
    entry!.users -= 1;
    if (!entry!.users) {
      entry!.stop();
      entries!.delete(key);
    }
  };
}
