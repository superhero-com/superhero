/**
 * Nostr client — ported from
 * `superhero-app/src/features/chat/nostr/nostr-client.ts`.
 *
 * Wraps `nostr-tools/pool`'s `SimplePool`: subscriptions, publish, fetch, with a
 * small on/off/emit event surface. Verbose `console.*` diagnostics from the app
 * are removed for the web build's no-console rule; behaviour is unchanged.
 *
 * Custody: the signing key flows through a revocable
 * `NostrIdentityProvider` (see `../identity`), never a raw `UserKeys`. Publishing
 * signs via `identity.signEvent`, so once the session is locked the provider
 * rejects and this client can no longer sign — no retained private key.
 */
import { SimplePool, type SubscribeManyParams } from 'nostr-tools/pool';
import type { EventTemplate, VerifiedEvent } from 'nostr-tools/pure';
import type { Filter } from 'nostr-tools/filter';
import type {
  NostrEvent, NostrFilter, RelayDict,
} from '../core/types';
import type { NostrIdentityProvider } from '../identity/nostr-identity';
import { RelayPublishError, type RelayRejection } from './relay-publish-error';

export type NostrClientEvents = {
  event: (event: NostrEvent) => void;
  connected: (relay: string) => void;
  disconnected: (relay: string) => void;
  error: (error: Error) => void;
  eose: (subId: string) => void;
};

/** Copy only the known filter fields into a fresh plain object. */
function cleanFilters(filters: NostrFilter[]): Filter[] {
  return filters
    .filter((f) => f && typeof f === 'object')
    .map((f) => {
      const clean: Filter = {};
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
 * Resolve as soon as ANY relay's publish fulfills; reject only when they all
 * reject, with a {@link RelayPublishError} that keeps each relay's own reason.
 * `promises[i]` belongs to `relays[i]` (the pool maps them in order).
 * `Promise.any` equivalent for the repo's pre-ES2021 TS lib target.
 */
function firstResolved<T>(relays: string[], promises: Promise<T>[]): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (promises.length === 0) {
      reject(new Error('no relays to publish to'));
      return;
    }
    const rejections: RelayRejection[] = [];
    let pending = promises.length;
    promises.forEach((p, i) => p.then(resolve, (error: unknown) => {
      // The pool rejects with an Error for a relay's `OK false` and with a plain
      // string ("connection failure: …") when the socket never opened.
      rejections[i] = {
        relay: relays[i],
        reason: error instanceof Error ? error.message : String(error),
      };
      pending -= 1;
      if (pending === 0) reject(new RelayPublishError(rejections));
    }));
  });
}

export class NostrClient {
  private pool: SimplePool;

  private identity: NostrIdentityProvider;

  private relays: RelayDict;

  private subscriptions: Map<string, { close(): void }>;

  private eventHandlers: Map<keyof NostrClientEvents, Set<(...args: unknown[]) => void>>;

  constructor(identity: NostrIdentityProvider, relays: RelayDict) {
    this.identity = identity;
    this.relays = relays;
    this.subscriptions = new Map();
    this.eventHandlers = new Map();
    this.pool = new SimplePool({ enableReconnect: true });
    this.pool.onRelayConnectionSuccess = (url) => this.emit('connected', url);
    this.pool.onRelayConnectionFailure = (url) => this.emit('disconnected', url);
  }

  private signAuth = async (template: EventTemplate): Promise<VerifiedEvent> => (
    await this.identity.signEvent(template) as unknown as VerifiedEvent
  );

  on<K extends keyof NostrClientEvents>(event: K, handler: NostrClientEvents[K]): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler as (...args: unknown[]) => void);
  }

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
    if (!readRelays.length) throw new Error('No chat relays enabled for reading.');
    const valid = cleanFilters(filters);
    const results = await Promise.all(
      valid.map((filter) => new Promise<NostrEvent[]>((resolve, reject) => {
        const events: NostrEvent[] = [];
        const id = generateSubscriptionId();
        const abort = new AbortController();
        let settled = false;
        const params: SubscribeManyParams = {
          abort: abort.signal,
          onauth: this.signAuth,
          onevent: (event) => events.push(event as NostrEvent),
          onclose: (reasons) => {
            if (settled) return;
            settled = true;
            abort.abort();
            this.subscriptions.delete(id);
            // The pool closes normally after EOSE. A rejected REQ must not be
            // presented as an empty, successfully synchronized inbox.
            if (!events.length && reasons.every(({ reason }) => reason !== 'closed automatically on eose')) {
              reject(new RelayPublishError(reasons.map(({ url, reason }) => ({ relay: url, reason }))));
            } else resolve(events);
          },
        };
        const sub = this.pool.subscribeEose(readRelays, filter, params);
        this.subscriptions.set(id, { close: () => { abort.abort(); sub.close(); } });
      })),
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

    // subscribeMany takes ONE filter in nostr-tools 2.x. subscribeMap groups
    // these entries into a valid REQ with multiple filter objects per relay.
    const abort = new AbortController();
    const sub = this.pool.subscribeMap(readRelays.flatMap(
      (url) => valid.map((filter) => ({ url, filter })),
    ), {
      abort: abort.signal,
      onauth: this.signAuth,
      onevent: (event: unknown) => {
        const nostrEvent = event as NostrEvent;
        this.emit('event', nostrEvent);
        onEvent?.(nostrEvent);
      },
      oneose: () => {
        this.emit('eose', subId);
      },
      onclose: (reasons) => {
        if (!abort.signal.aborted) {
          this.emit('error', new Error(reasons.map(({ reason }) => reason).join('; ')));
        }
      },
    });

    this.subscriptions.set(subId, { close: () => { abort.abort(); sub.close(); } });
    return subId;
  }

  unsubscribe(subId: string): void {
    const sub = this.subscriptions.get(subId);
    if (sub) {
      sub.close();
      this.subscriptions.delete(subId);
    }
  }

  /**
   * Sign (via the revocable identity) and publish an event. Returns its id.
   * A relay that answers `auth-required:` gets a NIP-42 AUTH signed by the same
   * identity and then the event once more (the pool's own retry). When no relay
   * accepts, rejects with a {@link RelayPublishError} naming each relay's reason.
   */
  async publishEvent(eventTemplate: EventTemplate): Promise<string> {
    const writeRelays = this.getWriteRelays();
    const event = await this.identity.signEvent(eventTemplate);
    await firstResolved(
      writeRelays,
      this.pool.publish(writeRelays, event as unknown as VerifiedEvent, { onauth: this.signAuth }),
    );
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
