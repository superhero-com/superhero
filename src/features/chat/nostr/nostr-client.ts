/**
 * Nostr client — ported from
 * `superhero-app/src/features/chat/nostr/nostr-client.ts`.
 *
 * Wraps `nostr-tools/pool`'s `SimplePool`: subscriptions, publish, fetch, with a
 * small on/off/emit event surface. Verbose `console.*` diagnostics from the app
 * are removed for the web build's no-console rule; behaviour is unchanged.
 *
 * NOTE (custody, stage 3+): this class currently takes raw `UserKeys` and signs
 * with `keys.privateKey`, matching the app. In the web build the signing key
 * must flow through `NostrIdentityProvider` (see `../identity`) instead of a raw
 * key — the refactor to publish via the provider lands with the chat transport
 * in a later stage.
 */
import { SimplePool } from 'nostr-tools/pool';
import { finalizeEvent, type EventTemplate, type VerifiedEvent } from 'nostr-tools/pure';
import { hexToBytes } from '@noble/hashes/utils';
import type {
  NostrEvent, NostrFilter, UserKeys, RelayDict,
} from '../core/types';

export type NostrClientEvents = {
  event: (event: NostrEvent) => void;
  connected: (relay: string) => void;
  disconnected: (relay: string) => void;
  error: (error: Error) => void;
  eose: (subId: string) => void;
};

type AnyFilter = Record<string, unknown>;

/** Copy only the known filter fields into a fresh plain object. */
function cleanFilters(filters: NostrFilter[]): AnyFilter[] {
  return filters
    .filter((f) => f && typeof f === 'object')
    .map((f) => {
      const clean: AnyFilter = {};
      if (f.ids) clean.ids = f.ids;
      if (f.authors) clean.authors = f.authors;
      if (f.kinds) clean.kinds = f.kinds;
      if (f['#e']) clean['#e'] = f['#e'];
      if (f['#p']) clean['#p'] = f['#p'];
      if (f.since) clean.since = f.since;
      if (f.until) clean.until = f.until;
      if (f.limit) clean.limit = f.limit;
      return clean;
    });
}

let subCounter = 0;
function generateSubscriptionId(): string {
  subCounter += 1;
  return `sub_${Date.now()}_${subCounter}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Resolve as soon as ANY input promise fulfills; reject only when they all
 * reject. `Promise.any` equivalent for the repo's pre-ES2021 TS lib target.
 */
function firstResolved<T>(promises: Promise<T>[]): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (promises.length === 0) {
      reject(new Error('no relays to publish to'));
      return;
    }
    let pending = promises.length;
    promises.forEach((p) => p.then(resolve, () => {
      pending -= 1;
      if (pending === 0) reject(new Error('all relays rejected the event'));
    }));
  });
}

export class NostrClient {
  private pool: SimplePool;

  private keys: UserKeys;

  private relays: RelayDict;

  private subscriptions: Map<string, { close(): void }>;

  private eventHandlers: Map<keyof NostrClientEvents, Set<(...args: unknown[]) => void>>;

  constructor(keys: UserKeys, relays: RelayDict) {
    this.keys = keys;
    this.relays = relays;
    this.pool = new SimplePool();
    this.subscriptions = new Map();
    this.eventHandlers = new Map();
  }

  /** Register an event handler. */
  on<K extends keyof NostrClientEvents>(event: K, handler: NostrClientEvents[K]): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler as (...args: unknown[]) => void);
  }

  /** Unregister an event handler. */
  off<K extends keyof NostrClientEvents>(event: K, handler: NostrClientEvents[K]): void {
    this.eventHandlers.get(event)?.delete(handler as (...args: unknown[]) => void);
  }

  private emit<K extends keyof NostrClientEvents>(
    event: K,
    ...args: Parameters<NostrClientEvents[K]>
  ): void {
    this.eventHandlers.get(event)?.forEach((handler) => {
      try {
        handler(...args);
      } catch {
        // a throwing listener must not break fan-out to the others
      }
    });
  }

  /** Replace the signing/identity keys. */
  updateKeys(keys: UserKeys): void {
    this.keys = keys;
  }

  /** Replace the relay set. */
  updateRelays(relays: RelayDict): void {
    this.relays = relays;
  }

  private getReadRelays(): string[] {
    return Object.entries(this.relays)
      .filter(([, config]) => config.read)
      .map(([url]) => url);
  }

  private getWriteRelays(): string[] {
    return Object.entries(this.relays)
      .filter(([, config]) => config.write)
      .map(([url]) => url);
  }

  /** Fetch stored events for the given filters (one query per filter). */
  async fetchEvents(filters: NostrFilter[]): Promise<NostrEvent[]> {
    const readRelays = this.getReadRelays();
    const valid = cleanFilters(filters);
    const results = await Promise.all(
      valid.map((filter) => this.pool.querySync(readRelays, filter as never).catch(() => [])),
    );
    return results.flat() as NostrEvent[];
  }

  /** Subscribe to live events for the given filters. Returns a subscription id. */
  subscribe(filters: NostrFilter[], onEvent?: (event: NostrEvent) => void): string {
    const subId = generateSubscriptionId();
    const readRelays = this.getReadRelays();
    const valid = cleanFilters(filters);
    if (valid.length === 0) {
      return subId;
    }

    const sub = this.pool.subscribeMany(readRelays, valid as never, {
      onevent: (event: unknown) => {
        const nostrEvent = event as NostrEvent;
        this.emit('event', nostrEvent);
        onEvent?.(nostrEvent);
      },
      oneose: () => {
        this.emit('eose', subId);
      },
    });

    this.subscriptions.set(subId, sub);
    return subId;
  }

  /** Close a single subscription. */
  unsubscribe(subId: string): void {
    const sub = this.subscriptions.get(subId);
    if (sub) {
      sub.close();
      this.subscriptions.delete(subId);
    }
  }

  /** Finalize (sign) and publish an event to the write relays. Returns its id. */
  async publishEvent(eventTemplate: EventTemplate): Promise<string> {
    const writeRelays = this.getWriteRelays();
    const event = finalizeEvent(eventTemplate, hexToBytes(this.keys.privateKey));
    await firstResolved(this.pool.publish(writeRelays, event as VerifiedEvent));
    return event.id;
  }

  /** Close all subscriptions and relay connections. */
  destroy(): void {
    this.subscriptions.forEach((sub) => sub.close());
    this.subscriptions.clear();
    this.pool.close(Object.keys(this.relays));
    this.eventHandlers.clear();
  }
}
