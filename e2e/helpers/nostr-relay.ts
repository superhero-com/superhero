import { randomUUID } from 'node:crypto';
// This helper only runs in the Node-based test runner.
// eslint-disable-next-line import/no-extraneous-dependencies
import { WebSocketServer, type WebSocket } from 'ws';
import { verifyEvent, type Event } from 'nostr-tools/pure';
import { matchFilters, type Filter } from 'nostr-tools/filter';

/** Strict, isolated NIP-01/42/29 fixture; no production keys or membership writes. */
export async function startNostrRelay(port = 0) {
  const server = new WebSocketServer({ host: '127.0.0.1', port });
  const events = new Map<string, Event>();
  const rooms = new Map<string, { private: boolean; members: Set<string> }>();
  const connections = new Map<WebSocket, {
    challenge: string;
    pubkey?: string;
    subscriptions: Map<string, Filter[]>;
  }>();
  const invalidRequests: unknown[] = [];
  let url = '';
  let authCount = 0;

  function canRead(pubkey: string | undefined, event: Event) {
    const group = event.tags.find(([tag]) => tag === 'h')?.[1];
    const room = group ? rooms.get(group) : undefined;
    if (room?.private && (!pubkey || !room.members.has(pubkey))) return false;
    return event.kind !== 4 || (!!pubkey && (
      event.pubkey === pubkey || event.tags.some(([tag, value]) => tag === 'p' && value === pubkey)
    ));
  }

  server.on('connection', (socket) => {
    const state = { challenge: randomUUID(), subscriptions: new Map<string, Filter[]>() } as {
      challenge: string; pubkey?: string; subscriptions: Map<string, Filter[]>;
    };
    connections.set(socket, state);
    const send = (message: unknown[]) => socket.send(JSON.stringify(message));
    // Challenge on demand exercises the NIP-42 CLOSED -> AUTH -> REQ path.
    const challenge = () => send(['AUTH', state.challenge]);
    socket.on('message', (raw) => {
      const [type, value, ...rest] = JSON.parse(raw.toString());
      if (type === 'AUTH') {
        const event = value as Event;
        const valid = verifyEvent(event) && event.kind === 22242
          && event.tags.some(([tag, v]) => tag === 'challenge' && v === state.challenge)
          && event.tags.some(([tag, v]) => tag === 'relay' && v.replace(/\/$/, '') === url);
        if (valid) {
          state.pubkey = event.pubkey;
          authCount += 1;
        }
        send(['OK', event.id, valid, valid ? '' : 'restricted: invalid authentication']);
      } else if (type === 'REQ') {
        const filters = rest as Filter[];
        if (!filters.length || filters.some((f) => !f || Array.isArray(f) || typeof f !== 'object')) {
          invalidRequests.push(rest);
          send(['CLOSED', value, 'invalid: filters must be objects']);
          return;
        }
        if (!state.pubkey) {
          challenge();
          send(['CLOSED', value, 'auth-required: authenticate before reading']);
          return;
        }
        const denied = filters.some((f) => (f['#h'] ?? []).some((id) => {
          const room = rooms.get(id);
          return room?.private && !room.members.has(state.pubkey!);
        }));
        if (denied) {
          send(['CLOSED', value, 'restricted: not a member']);
          return;
        }
        state.subscriptions.set(value, filters);
        [...events.values()].filter((event) => matchFilters(filters, event) && canRead(state.pubkey, event))
          .sort((a, b) => b.created_at - a.created_at)
          .slice(0, Math.max(...filters.map((f) => f.limit ?? events.size)))
          .forEach((event) => send(['EVENT', value, event]));
        send(['EOSE', value]);
      } else if (type === 'EVENT') {
        const event = value as Event;
        if (!verifyEvent(event)) {
          send(['OK', event.id, false, 'invalid: bad signature']);
          return;
        }
        if (!state.pubkey) {
          challenge();
          send(['OK', event.id, false, 'auth-required: authenticate before posting']);
          return;
        }
        const group = event.tags.find(([tag]) => tag === 'h')?.[1];
        if (group && !rooms.get(group)?.members.has(event.pubkey)) {
          send(['OK', event.id, false, 'restricted: not a member']);
          return;
        }
        events.set(event.id, event);
        // Deliberately echo BEFORE OK to expose optimistic-message duplication.
        connections.forEach((peer, client) => peer.subscriptions.forEach((filters, id) => {
          if (matchFilters(filters, event) && canRead(peer.pubkey, event)) {
            client.send(JSON.stringify(['EVENT', id, event]));
          }
        }));
        send(['OK', event.id, true, '']);
      } else if (type === 'CLOSE') {
        state.subscriptions.delete(value);
      }
    });
    socket.on('close', () => connections.delete(socket));
  });
  await new Promise<void>((resolve, reject) => {
    server.on('listening', resolve);
    server.on('error', reject);
  });
  const address = server.address() as { port: number };
  url = `ws://127.0.0.1:${address.port}`;
  return {
    url,
    rooms,
    events,
    invalidRequests,
    get authCount() { return authCount; },
    get connectionCount() { return connections.size; },
    close: () => new Promise<void>((resolve) => {
      server.clients.forEach((client) => client.terminate());
      server.close(() => resolve());
    }),
  };
}
