/**
 * Gated-room client — token-gated group chat over the NIP-29 groups_relay.
 * Ported from `superhero-app/src/features/chat/nostr/gated-room.ts`, trimmed to
 * the stage-3 read/subscribe/post surface. The user-created-group
 * MANAGEMENT + discovery methods (9000/9001/9002/9007, `discoverMyGroups`,
 * previews) are intentionally dropped: the API bot owns membership for token
 * rooms and user groups are out of scope (`14-user-groups.md`).
 *
 * Deliberately separate from the general `NostrClient`/`SimplePool`: that pool
 * strips `#h`/`#d` filters. This holds one dedicated
 * nostr-tools `Relay` over the relay URL from the API (`GET /api/rooms/config` →
 * `relay_url`, never a hard-coded host), guarded to `wss://` by
 * {@link ensureSecureRelayUrl}.
 *
 * Custody: signing (kind-9 posts + NIP-42 AUTH) flows through a
 * revocable `NostrIdentityProvider`, never a raw key — once the session locks,
 * the provider rejects and this client can no longer sign. Read-only flows
 * (public metadata / history) work with a `null` identity.
 *
 *   - messages: kind 9/11 carrying `["h", saleAddress]`
 *   - metadata: kind 39000 (addressable by `#d`; fields live in TAGS)
 *   - private groups: reading requires NIP-42 AUTH + membership
 *
 * The NIP-29 group id is the token **sale address** (`ct_…`) verbatim.
 */
import { Relay, type SubscriptionParams } from 'nostr-tools/relay';
import type { EventTemplate, VerifiedEvent } from 'nostr-tools/pure';
import type { Filter } from 'nostr-tools/filter';
import { NostrKind } from '../core/constants';
import type { NostrEvent } from '../core/types';
import type { NostrIdentityProvider } from '../identity/nostr-identity';
import { ensureSecureRelayUrl } from './relay-url';
import { GatedRoomPublishError } from './gated-room-error';

export { GatedRoomPublishError } from './gated-room-error';
export type { GatedRoomErrorReason } from './gated-room-error';

const nowSec = (): number => Math.floor(Date.now() / 1000);

/** Thread message kinds (chat + thread root). */
const ROOM_MESSAGE_KINDS = [NostrKind.GroupChatMessage, NostrKind.GroupThreadRoot];
/**
 * Membership/management kinds surfaced as in-thread system lines. Only requested
 * when the caller opts in (`includeSystem`) — token rooms leave them out (the API
 * bot churns thousands of 9000s, which would be noise).
 */
const ROOM_SYSTEM_KINDS = [
  NostrKind.GroupAddUser,
  NostrKind.GroupRemoveUser,
  NostrKind.GroupLeaveRequest,
];
const ROOM_MESSAGE_KINDS_WITH_SYSTEM = [...ROOM_MESSAGE_KINDS, ...ROOM_SYSTEM_KINDS];

export interface GroupMetadata {
  name?: string;
  about?: string;
  picture?: string;
  isPrivate: boolean;
  isClosed: boolean;
}

/** One entry of a relay-signed admin list (kind 39001): a pubkey + its roles. */
export interface GroupRosterEntry {
  pubkey: string;
  roles: string[];
}

function parseGroupMetadata(event: NostrEvent): GroupMetadata {
  const tag = (name: string) => event.tags.find((t) => t[0] === name)?.[1];
  const has = (name: string) => event.tags.some((t) => t[0] === name);
  return {
    name: tag('name'),
    about: tag('about'),
    picture: tag('picture'),
    isPrivate: has('private'),
    isClosed: has('closed'),
  };
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs: number,
): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) return;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => {
      setTimeout(r, 50);
    });
  }
}

export class GatedRoomClient {
  private relay: Relay | null = null;

  private connecting: Promise<Relay> | null = null;

  private closed = false;

  private connectionAbort = new AbortController();

  private readonly identity: NostrIdentityProvider | null;

  private readonly url: string;

  /**
   * The relay's own pubkey, learned from any relay-signed addressable event
   * (39000/39001/39002). Lets callers tell a relay/system-authored `9000` apart
   * from a real admin's "added X". Null until a relay-signed event is seen.
   */
  relayPubkey: string | null = null;

  /**
   * @param identity revocable provider used to sign kind-9 posts + NIP-42 AUTH,
   *                 or `null` for read-only (public) access. A locked provider
   *                 rejects, so posting after lock fails instead of using a
   *                 stale key.
   * @param url      the groups_relay ws(s) URL — resolved from the API config;
   *                 rejected here unless it is `wss://` (or loopback `ws://`).
   */
  constructor(identity: NostrIdentityProvider | null, url: string) {
    if (!url) throw new Error('GatedRoomClient: relay url is required');
    this.url = ensureSecureRelayUrl(url);
    this.identity = identity;
  }

  async connect(): Promise<Relay> {
    if (this.closed) throw new Error('Room connection is closed.');
    if (this.relay?.connected) return this.relay;
    if (!this.connecting) {
      // Share one connection between concurrent metadata/history/send calls.
      const relay = new Relay(this.url);
      this.relay = relay;
      this.connecting = relay.connect({ timeout: 5000, abort: this.connectionAbort.signal }).then(() => {
        if (this.closed) {
          relay.close();
          throw new Error('Room connection is closed.');
        }
        return relay;
      }).catch((error: unknown) => {
        if (this.closed) throw new Error('Room connection is closed.');
        throw error instanceof Error ? error : new Error(String(error));
      }).finally(() => { this.connecting = null; });
    }
    return this.connecting;
  }

  private requireIdentity(): NostrIdentityProvider {
    if (!this.identity) {
      throw new Error('GatedRoomClient: a nostr identity is required to sign.');
    }
    return this.identity;
  }

  /**
   * NIP-42 AUTH — needed to READ private groups and to POST as a member when the
   * relay challenges. Authentication failures must reach the caller.
   */
  async authenticate(): Promise<void> {
    if (!this.identity) {
      throw new GatedRoomPublishError('auth-required: Unlock chat to access this room.');
    }
    const relay = await this.connect();
    const challenged = (): boolean => !!(relay as unknown as { challenge?: string }).challenge;
    await waitFor(challenged, 3000);
    if (!challenged()) throw new GatedRoomPublishError('auth-required: No relay challenge received.');
    const { identity } = this;
    await relay.auth(
      async (evt: EventTemplate): Promise<VerifiedEvent> => (
        await identity.signEvent(evt) as unknown as VerifiedEvent
      ),
    );
  }

  /** A relay may challenge only AFTER REQ; retry that REQ after AUTH succeeds. */
  private async subscribe(
    filter: Filter,
    callbacks: Pick<SubscriptionParams, 'onevent' | 'oneose'>,
    onError: (error: Error) => void,
  ): Promise<{ close: () => void }> {
    const relay = await this.connect();
    let stopped = false;
    let retried = false;
    let sub: { close: () => void } | undefined;
    const open = () => {
      if (stopped || this.closed) return;
      sub = relay.subscribe([filter], {
        ...callbacks,
        onclose: (reason) => {
          if (stopped || this.closed) return;
          const error = new GatedRoomPublishError(reason);
          if (error.isAuthRequired && this.identity && !retried) {
            retried = true;
            this.authenticate().then(open).catch(onError);
          } else onError(error);
        },
      });
    };
    open();
    return { close: () => { stopped = true; sub?.close(); } };
  }

  /**
   * Subscribe to a room's kind-9/11 messages (`#h` = saleAddress). An auth-required
   * rejection triggers NIP-42 AUTH and one retry, including late challenges.
   * Permanent rejections and disconnects are reported through onError.
   */
  async subscribeRoom(
    saleAddress: string,
    onEvent: (event: NostrEvent) => void,
    options: {
      includeSystem?: boolean;
      onError?: (error: Error) => void;
    } = {},
  ): Promise<{ close: () => void }> {
    return this.subscribe(
      {
        kinds: options.includeSystem ? ROOM_MESSAGE_KINDS_WITH_SYSTEM : ROOM_MESSAGE_KINDS,
        '#h': [saleAddress],
      },
      { onevent: (e) => onEvent(e as unknown as NostrEvent) },
      (error) => options.onError?.(error),
    );
  }

  /**
   * One-shot history backfill: REQ kind 9/11 (`#h` = saleAddress) bounded by
   * `until`/`limit`, collected until EOSE (or a 4s timeout) then closed.
   * Newest-first paging: pass the oldest currently-held `created_at` as `until`.
   * Rejects on timeout or denied access so the UI can distinguish an unavailable
   * room from a successfully loaded empty history.
   */
  async fetchRoomHistory(
    saleAddress: string,
    options: {
      until?: number;
      limit?: number;
      includeSystem?: boolean;
    } = {},
  ): Promise<NostrEvent[]> {
    const {
      until,
      limit = 50,
      includeSystem = false,
    } = options;
    const filter: Filter = {
      kinds: includeSystem ? ROOM_MESSAGE_KINDS_WITH_SYSTEM : ROOM_MESSAGE_KINDS,
      '#h': [saleAddress],
      limit,
    };
    if (typeof until === 'number') filter.until = until;
    return this.query(filter, 4000);
  }

  /**
   * Publish a kind-9 message. Signs FIRST (so a locked identity rejects before
   * any socket work), then connects + publishes. Throws
   * {@link GatedRoomPublishError} on relay reject.
   */
  async sendRoomMessage(saleAddress: string, content: string): Promise<string> {
    const identity = this.requireIdentity();
    const event = await identity.signEvent({
      kind: NostrKind.GroupChatMessage,
      created_at: nowSec(),
      tags: [['h', saleAddress]],
      content,
    });
    const relay = await this.connect();
    try {
      await relay.publish(event as unknown as VerifiedEvent);
    } catch (error) {
      const err = new GatedRoomPublishError(
        error instanceof Error ? error.message : String(error),
      );
      if (!err.isAuthRequired) throw err;
      // The relay demanded AUTH — authenticate and retry once.
      await this.authenticate();
      try {
        await relay.publish(event as unknown as VerifiedEvent);
      } catch (retry) {
        throw new GatedRoomPublishError(
          retry instanceof Error ? retry.message : String(retry),
        );
      }
    }
    return event.id;
  }

  /** Fetch a room's relay-signed metadata (kind 39000). Fields are in TAGS. */
  async getGroupMetadata(saleAddress: string): Promise<GroupMetadata | null> {
    const events = await this.query(
      { kinds: [NostrKind.GroupMetadata], '#d': [saleAddress] },
      2500,
    );
    this.rememberRelayPubkey(events);
    return events.length ? parseGroupMetadata(events[0]) : null;
  }

  /** Cache the relay's pubkey from a relay-signed addressable event (idempotent). */
  private rememberRelayPubkey(events: NostrEvent[]): void {
    if (!this.relayPubkey && events.length) this.relayPubkey = events[0].pubkey;
  }

  /**
   * Relay-signed member list (kind 39002). Returns member pubkeys (the `p` tags).
   * Read-only liveness supplement — the API is the source of truth. A *private*
   * room's list requires NIP-42 AUTH first.
   */
  async getGroupMembers(saleAddress: string): Promise<string[]> {
    const events = await this.query(
      { kinds: [NostrKind.GroupMembers], '#d': [saleAddress] },
      2500,
    );
    this.rememberRelayPubkey(events);
    if (!events.length) return [];
    return events[0].tags
      .filter((t) => t[0] === 'p' && !!t[1])
      .map((t) => t[1]);
  }

  /**
   * Relay-signed admin list (kind 39001). Each `p` tag is
   * `["p", <pubkey>, ...roles]` per NIP-29, so keep the trailing roles.
   * Read-only liveness supplement — the API is the source of truth.
   */
  async getGroupAdmins(saleAddress: string): Promise<GroupRosterEntry[]> {
    const events = await this.query(
      { kinds: [NostrKind.GroupAdmins], '#d': [saleAddress] },
      2500,
    );
    this.rememberRelayPubkey(events);
    if (!events.length) return [];
    return events[0].tags
      .filter((t) => t[0] === 'p' && !!t[1])
      .map((t) => ({ pubkey: t[1], roles: t.slice(2).filter(Boolean) }));
  }

  /** One-shot REQ: collect events until EOSE (or timeout), then close. */
  private async query(
    filter: Filter,
    timeoutMs: number,
  ): Promise<NostrEvent[]> {
    return new Promise((resolve, reject) => {
      const out: NostrEvent[] = [];
      let settled = false;
      let sub: { close: () => void } | null = null;
      let timer: ReturnType<typeof setTimeout>;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          sub?.close();
        } catch {
          /* ignore */
        }
        if (error) reject(error);
        else resolve(out);
      };
      this.subscribe(filter, {
        onevent: (e) => out.push(e as unknown as NostrEvent),
        oneose: () => finish(),
      }, finish).then((subscription) => {
        sub = subscription;
        if (settled) sub.close();
      }).catch(finish);
      timer = setTimeout(() => finish(new Error('Room history request timed out.')), timeoutMs);
    });
  }

  close(): void {
    this.closed = true;
    this.connectionAbort.abort();
    this.relay?.close();
    this.relay = null;
  }
}
