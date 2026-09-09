/* eslint-disable no-use-before-define, class-methods-use-this */
/* eslint-disable no-console, no-void */
/**
 * Core client for the Superhero web notification feature. Framework-agnostic
 * (no React) so it is easy to test and reason about; `useNotifications` wraps it.
 *
 * It encodes the three contracts that are easy to get wrong:
 *   1. ONE æternity signature -> a bearer session, reused for REST + socket +
 *      web-push subscribe (never re-signs per request; caches the token).
 *   2. The feed + unread-count (REST) are the SOURCE OF TRUTH — re-fetch BOTH on
 *      every socket (re)connect; live events are optimistic, deduped by id.
 *   3. Native browser push (VAPID) subscribes with the same bearer, so a closed
 *      tab still gets an OS notification.
 *
 * Testability: `io`, `fetch` and `log` are injectable via options (default to the
 * real implementations) so tests need no module mocking.
 *
 * See superhero-api/docs/notifications-web-feed.md for the protocol.
 */
import { io as realIo, type Socket } from 'socket.io-client';
import { trustedScriptUrl } from '@/utils/trustedTypes';
import { ClientLifecycle } from './client-lifecycle';
import { RecoveryLadder } from './recovery-ladder';
import { SingleFlight } from './single-flight';

export interface FeedItem {
  id: number;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
}

export type PushState =
  | 'unsupported' // no serviceWorker / PushManager / Notification in this browser
  | 'unconfigured' // backend has no VAPID key
  | 'denied' // user denied the OS permission
  | 'default' // not yet asked / not subscribed
  | 'subscribed';

/** Minimal shape of socket.io-client's `io()` we depend on (for injection). */
type IoFactory = (uri: string, opts?: Record<string, unknown>) => Socket;

export interface NotificationClientOptions {
  /** API origin, e.g. 'https://testnet.api.dev.tokensale.org'. No trailing slash. */
  baseUrl: string;
  /** The connected account, ak_…. */
  address: string;
  /** Wallet message-signing. Must resolve to an sg_… or hex signature string. */
  signMessage: (message: string) => Promise<string>;
  /** Called with the freshly-reconciled, newest-first list whenever it changes. */
  onItems?: (items: FeedItem[]) => void;
  /** Called with the unread badge value whenever it changes. */
  onUnreadCount?: (count: number) => void;
  /** Called for each NEW live item (post-dedupe) — e.g. to alert/toast. */
  onNotification?: (item: FeedItem) => void;
  /** Optional logger; defaults to console. All debug output routes through this. */
  log?: (msg: string, err?: unknown) => void;
  /**
   * Diagnostic mode: the connection watchdog and the per-event trace. Off by
   * default so production doesn't narrate every socket event (and the session
   * token's tail) to the console. Callers pass `import.meta.env.DEV`.
   * A custom `log` still receives everything; this only gates the CONSOLE default
   * and the watchdog timer.
   */
  debug?: boolean;
  /** Cap of items kept in memory (prevents unbounded growth). Default 200. */
  maxItems?: number;
  /** Injectable socket.io factory (tests pass a fake). Defaults to real `io`. */
  io?: IoFactory;
  /** Injectable fetch (tests pass a mock). Defaults to global `fetch`. */
  fetch?: typeof fetch;
}

interface CachedSession {
  token: string;
  expiresAt: number; // epoch ms
}

const DEFAULT_MAX_ITEMS = 200;

// Re-exported for callers (and tests) that reason about the socket's health
// threshold; the rule itself lives with the ladder that applies it.
export { HEALTHY_CONNECTION_MS } from './recovery-ladder';

/** Exact message the server rebuilds in buildFeedSessionMessage(address, nonce). */
export function buildFeedSessionMessage(address: string, nonce: string): string {
  return `Superhero Notifications\nOpen notification feed session for ${address}\nnonce: ${nonce}`;
}

export class NotificationFeedClient {
  private token: string | null = null;

  private socket: Socket | null = null;

  private items: FeedItem[] = [];

  /**
   * Local mirror of the unread badge, kept so the 'notification' socket handler
   * can bump it optimistically the instant a live item arrives — the server
   * happens to emit a matching 'unread-count' event right after (see
   * database.channel.ts), but the badge shouldn't be hostage to that event
   * landing/ordering correctly; refresh()/markRead() still resync it to the
   * server's authoritative count.
   */
  private unreadCount = 0;

  /**
   * Which run of this client is current and whether it is live — the answer to
   * "may this continuation still publish / connect?" (see ClientLifecycle).
   */
  private readonly lifecycle = new ClientLifecycle();

  /** Escalation state for the best-effort live layer (see RecoveryLadder). */
  private readonly ladder = new RecoveryLadder();

  /** One bootstrap at a time, so a burst of 401s triggers ONE signature. */
  private readonly sessionFlight = new SingleFlight<string>();

  /** One start() at a time (e.g. connect() racing enablePush()). */
  private readonly startFlight = new SingleFlight<void>();

  /** One refresh() at a time (reconnect churn). */
  private readonly refreshFlight = new SingleFlight<void>();

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private watchdogTimer: ReturnType<typeof setInterval> | null = null;

  private visibilityHandler: (() => void) | null = null;

  private swMessageHandler: ((event: MessageEvent) => void) | null = null;

  private readonly ioFactory: IoFactory;

  private readonly maxItems: number;

  /**
   * The owner callbacks, and the ONLY way this client publishes anything.
   *
   * They are wrapped once here rather than guarded at each call site because the
   * setters behind them are SHARED by every client instance — one
   * NotificationsProvider for the whole app, a new client per account — so a
   * publish from a stopped instance lands on whichever account is on screen now.
   * Making that structurally impossible is the point: relying on each publish site
   * to remember `stopped` is exactly how the live-event handlers came to miss it.
   */
  private readonly notify: {
    items: (items: FeedItem[]) => void;
    unread: (count: number) => void;
    live: (item: FeedItem) => void;
  };

  /** Shorthand for the many "bail out, this client was torn down" checks. */
  private get stopped(): boolean {
    return !this.lifecycle.isRunning;
  }

  constructor(private readonly opts: NotificationClientOptions) {
    this.ioFactory = opts.io ?? (realIo as unknown as IoFactory);
    this.maxItems = opts.maxItems ?? DEFAULT_MAX_ITEMS;
    this.notify = {
      items: (items) => { if (!this.stopped) opts.onItems?.(items); },
      unread: (count) => { if (!this.stopped) opts.onUnreadCount?.(count); },
      live: (item) => { if (!this.stopped) opts.onNotification?.(item); },
    };
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────

  /** Bootstrap a session (signs once), do the initial fetch, open the socket. */
  async start(): Promise<void> {
    // Concurrent callers (connect() racing enablePush()) join one bootstrap rather
    // than each opening a socket and dropping the other's. `begin()` runs only for
    // the caller that actually starts it, so joiners share its run id.
    return this.startFlight.run(() => this.doStart(this.lifecycle.begin()));
  }

  private async doStart(runId: number): Promise<void> {
    // A restart (e.g. the user re-enabling the feed) is a new episode by
    // definition — don't inherit a ladder that was already exhausted.
    this.ladder.reset();
    this.registerVisibilityHandler();
    this.registerSwMessageHandler();
    await this.ensureSession();
    // Re-checked after EVERY await, not just the first: a run this call no longer
    // owns must not act. After a stop() that is merely pointless, but after a
    // stop()+start() it is actively wrong — `stopped` is false again, so this
    // zombie would open a second socket for the newer run to tear down.
    if (!this.lifecycle.owns(runId)) return;
    await this.refresh(); // initial source-of-truth load
    if (!this.lifecycle.owns(runId)) return;
    this.connectSocket();
    // Deliberately not awaited: repairing a stale push endpoint must never delay
    // — or fail — bringing the feed up.
    void this.reassertPushSubscription();
  }

  stop(): void {
    this.lifecycle.end();
    // Drop the in-flight bootstrap/refresh. Both are already barred from
    // publishing, but a later start() that ADOPTED one of them would resolve having
    // done nothing — no socket, no feed — while the caller happily reports
    // "connected". The session bootstrap is deliberately kept: it is for this same
    // address, so a pending wallet signature stays reusable instead of prompting
    // the user twice.
    this.startFlight.abandon();
    this.refreshFlight.abandon();
    this.clearReconnectTimer();
    this.clearWatchdog();
    this.unregisterVisibilityHandler();
    this.unregisterSwMessageHandler();
    this.socket?.disconnect();
    this.socket = null;
    this.token = null;
  }

  getItems(): FeedItem[] {
    return this.items;
  }

  /**
   * Whether a session already exists that start() can reuse WITHOUT any wallet
   * interaction. This is what lets the UI auto-connect on load: the no-prompt-on-
   * page-load rule protects the user from a surprise signature, and there is no
   * signature to be had here (see ensureSession).
   */
  hasCachedSession(): boolean {
    return !!this.token || !!this.loadCachedToken();
  }

  // ── auth: one signature -> bearer session (cached) ─────────────────────────

  private storageKey(): string {
    return `sh:notif:session:${this.opts.baseUrl}:${this.opts.address}`;
  }

  private loadCachedToken(): string | null {
    try {
      const raw = typeof window !== 'undefined'
        ? window.localStorage.getItem(this.storageKey())
        : null;
      if (!raw) return null;
      const cached = JSON.parse(raw) as CachedSession;
      // 30s skew guard so we don't hand out a token about to expire.
      if (cached.token && cached.expiresAt - 30_000 > Date.now()) {
        return cached.token;
      }
    } catch {
      /* ignore malformed cache */
    }
    return null;
  }

  private saveCachedToken(token: string, expiresAtIso: string): void {
    try {
      if (typeof window === 'undefined') return;
      const expiresAt = Date.parse(expiresAtIso);
      window.localStorage.setItem(
        this.storageKey(),
        JSON.stringify({
          token,
          // Fallback: 6 days if the server timestamp is unparseable.
          expiresAt: Number.isFinite(expiresAt) ? expiresAt : Date.now() + 6 * 864e5,
        } as CachedSession),
      );
    } catch {
      /* ignore quota / disabled storage */
    }
  }

  private clearCachedToken(): void {
    this.token = null;
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(this.storageKey());
      }
    } catch {
      /* ignore */
    }
  }

  /** Return a valid bearer token, minting one (single signature) if needed. */
  private async ensureSession(forceRenew = false): Promise<string> {
    if (!forceRenew) {
      if (this.token) {
        this.log('reusing in-memory session (no signature needed)');
        return this.token;
      }
      const cached = this.loadCachedToken();
      if (cached) {
        this.log('reusing CACHED session (no signature needed — clear it to force a sign)');
        this.token = cached;
        return cached;
      }
    }
    // Collapse concurrent callers onto one bootstrap (one wallet prompt).
    if (!this.sessionFlight.pending) {
      this.log(`no valid session${forceRenew ? ' (forced renew)' : ''} — requesting wallet signature…`);
    }
    return this.sessionFlight.run(() => this.bootstrapSession());
  }

  private async bootstrapSession(): Promise<string> {
    const { address } = this.opts;
    const challenge = await this.rawPost<{ nonce: string }>(
      `/${address}/feed/challenge`,
    );
    this.log('challenge received — calling wallet signMessage (popup should appear now)');
    const message = buildFeedSessionMessage(address, challenge.nonce);
    const signature = await this.opts.signMessage(message);
    this.log('signature obtained — minting session');
    const session = await this.rawPost<{ token: string; expiresAt: string }>(
      `/${address}/feed/session`,
      { nonce: challenge.nonce, signature },
    );
    this.token = session.token;
    this.saveCachedToken(session.token, session.expiresAt);
    this.log(`session bootstrapped for ${address} (token …${session.token.slice(-6)})`);
    return session.token;
  }

  // ── source of truth: REST ───────────────────────────────────────────────

  /** Re-fetch the first page AND the unread count, then publish both. */
  async refresh(): Promise<void> {
    // Coalesce concurrent refreshes (e.g. start() + a socket 'connect' racing).
    return this.refreshFlight.run(() => this.doRefresh(this.lifecycle.currentRun));
  }

  private async doRefresh(runId: number): Promise<void> {
    const [page, unread] = await Promise.all([
      this.get<{ items: FeedItem[]; nextCursor: number | null }>(
        `/${this.opts.address}/feed?limit=50`,
      ),
      this.get<{ count: number }>(`/${this.opts.address}/feed/unread-count`),
    ]);
    // Only the run that asked for this data may publish it. A stop() mid-flight
    // (account switch) is the obvious case, but `stopped` alone is not enough: a
    // stop()+start() makes it false again, so a refresh the teardown abandoned
    // would overwrite the NEW run's feed with a pre-restart snapshot — and if it
    // lands after the fresh one, that stale list and count stay. A live item then
    // missing from `items` is no longer deduped, so its next echo toasts twice and
    // inflates the badge on top of an already-stale count.
    if (!this.lifecycle.owns(runId)) return;
    this.items = this.capItems(dedupeById(page.items)); // server authoritative
    this.unreadCount = unread.count;
    this.notify.items(this.items);
    this.notify.unread(this.unreadCount);
  }

  /** Mark some (or, with no ids, all) read. Server returns the new unread total. */
  async markRead(ids?: number[]): Promise<void> {
    const runId = this.lifecycle.currentRun;
    const { count } = await this.post<{ count: number }>(
      `/${this.opts.address}/feed/read`,
      { ids },
    );
    // Same rule as doRefresh: only the run that issued this POST may publish its
    // result. A teardown — or a teardown and restart — can land while it is in
    // flight, and this count belongs to the account that was on screen then.
    if (!this.lifecycle.owns(runId)) return;
    const readAt = new Date().toISOString();
    // Leave alone: already-read items, or (when specific ids given) items not in
    // the target list. Otherwise stamp read_at.
    this.items = this.items.map((it) => {
      const outsideTargetList = !!ids && !ids.includes(it.id);
      return it.read_at || outsideTargetList ? it : { ...it, read_at: readAt };
    });
    this.unreadCount = count;
    this.notify.items(this.items);
    this.notify.unread(this.unreadCount);
  }

  private capItems(items: FeedItem[]): FeedItem[] {
    return items.length > this.maxItems ? items.slice(0, this.maxItems) : items;
  }

  // ── best-effort live layer ────────────────────────────────────────────────

  private connectSocket(): void {
    if (this.stopped || !this.token) return;
    this.clearWatchdog();
    // The outgoing socket's uptime must not be credited to the new one, or the
    // first disconnect after a rebuild would look like the end of a long,
    // healthy session and wipe the ladder.
    this.ladder.forgetConnection();
    this.socket?.disconnect();

    const url = `${this.opts.baseUrl}/notifications`;
    this.log(`connecting socket -> ${url}`);
    const socket = this.ioFactory(url, {
      auth: { token: this.token },
      // HTTP long-polling ONLY (no WebSocket upgrade). Diagnosis showed the
      // browser's WebSocket to the backend opens at the engine level but never
      // delivers the socket.io namespace CONNECT (handleConnection never runs),
      // while plain HTTP to the same origin works everywhere (REST, CORS, the
      // /socket.io polling handshake). Polling routes the whole socket.io
      // protocol over XHR, which is proven to work here.
      transports: ['polling'],
      upgrade: false,
      // forceNew: transport/upgrade are MANAGER-level; without this socket.io
      // reuses an existing Manager for this origin and silently ignores them.
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
    });
    this.socket = socket;

    this.startWatchdog(socket);

    // CRITICAL: every (re)connect re-syncs from the source of truth, because any
    // emit while disconnected — or on another replica — was never received.
    socket.on('connect', () => {
      this.log(`socket CONNECTED (id=${socket.id})`);
      // Deliberately does NOT clear the failure ladder — see
      // HEALTHY_CONNECTION_MS. Only 'disconnect' knows how long we actually held.
      this.ladder.noteConnected(Date.now());
      void this.refresh().catch((e) => this.log('refresh on connect failed', e));
    });

    socket.on('notification', (item: FeedItem) => {
      this.log(`socket received 'notification' #${item.id} (${item.title})`);
      // Same rule as doRefresh/markRead: a stopped client must never publish. The
      // React setters are SHARED across client instances (see NotificationsProvider
      // — one provider, one set of setters, a new client per account), so anything
      // this instance emits after stop() lands on whichever account is on screen
      // now. Guarding here also covers the local mirrors below, which would
      // otherwise drift from the server on the next markRead().
      if (this.stopped) return;
      // Dedupe echoes of an item we already have (O(n) membership, no rebuild).
      if (this.items.some((it) => it.id === item.id)) return;
      this.items = this.capItems([item, ...this.items]);
      // Bump the badge immediately rather than waiting on the separate
      // 'unread-count' event the server happens to emit right after — the bell
      // badge/pulse (keyed off unreadCount) shouldn't depend on that event's
      // ordering/delivery to reflect a live item that already landed.
      if (!item.read_at) {
        this.unreadCount += 1;
        this.notify.unread(this.unreadCount);
      }
      this.notify.items(this.items);
      this.notify.live(item);
    });

    socket.on('unread-count', (payload: { count?: unknown } | null) => {
      if (this.stopped) return; // never publish this account's badge onto another
      // Defensive like every sibling handler: this is untrusted wire data, and
      // destructuring a bare emit() threw inside the handler instead of being
      // ignored. A non-numeric count is nothing to publish — refresh()/markRead()
      // resync the badge from the authoritative REST count anyway.
      const count = payload?.count;
      if (typeof count !== 'number' || !Number.isFinite(count)) {
        this.log(`ignoring malformed 'unread-count' payload: ${JSON.stringify(payload)}`);
        return;
      }
      this.unreadCount = count;
      this.notify.unread(this.unreadCount);
    });

    // The gateway calls disconnect(true) for several reasons (bad/expired token,
    // per-address cap, join failure); socket.io reports them all as
    // 'io server disconnect' AND does not auto-reconnect, so recovery is ours to
    // schedule (see escalateRecovery).
    socket.on('disconnect', (reason: string) => {
      this.log(`socket DISCONNECTED (${reason})`);
      if (this.stopped) return;
      // A connection that actually held is what proves the token and the cap slot
      // are good, so that — not the bare 'connect' — is what starts a clean
      // episode. Noted before the reason check because a transport drop, which
      // socket.io retries by itself, still ends a healthy session.
      this.ladder.noteDisconnected(Date.now());
      if (reason !== 'io server disconnect') return; // transport drops auto-retry
      this.escalateRecovery(reason);
    });
    socket.on('connect_error', (err: Error) => {
      this.log(`socket connect_error: ${err?.message ?? err}`);
      if (this.stopped) return;
      // `active` is true while the manager is still retrying on its own — leave
      // those alone or a flaky network escalates on every attempt. socket.io sets
      // it false when it destroys the socket, i.e. the server refused the
      // handshake outright: nothing will retry that, so it has to feed the ladder
      // or an expired token can never be re-signed.
      if (socket.active) return;
      this.escalateRecovery('connect_error');
    });
    // Emitted once when reconnectionAttempts is used up. `socket.active` stays
    // true in that case and no further connect_error fires, so this is the only
    // signal that the auto-reconnect budget is gone and the live layer is dead.
    socket.io.on('reconnect_failed', () => {
      this.log('socket auto-reconnect attempts exhausted');
      if (this.stopped) return;
      this.escalateRecovery('reconnect_failed');
    });
  }

  /** Act on the rung this failure earns — see RecoveryLadder for the rules. */
  private escalateRecovery(cause: string): void {
    switch (this.ladder.nextStep()) {
      case 'reconnect':
        this.scheduleReconnect(); // reuse the token first — never prompts
        break;
      case 'reauth':
        this.scheduleReauth(); // token may be dead → verify, re-sign only if so
        break;
      default:
        this.log(
          `socket recovery exhausted after ${cause}; giving up live layer (REST still works)`,
        );
    }
  }

  /** Light reconnect that REUSES the current token (no signature). */
  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.stopped) return;
    const runId = this.lifecycle.currentRun;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      // A timer belongs to the run that scheduled it. stop() cancels a pending
      // one, but after a stop()+start() `this.socket` is the NEW run's socket and
      // this stale timer must not touch it.
      if (!this.lifecycle.owns(runId) || !this.socket) return;
      this.log('reconnecting socket (reusing token)…');
      this.socket.connect();
    }, 1000);
  }

  /**
   * Heavier recovery: revalidate the session, then rebuild the socket.
   *
   * The probe is an ordinary authed REST call, which makes `authedRequest` the
   * arbiter: a 401 there clears the cached token and re-signs exactly once — and
   * REST's verdict IS the socket's, since the gateway and the REST guard both
   * resolve tokens through FeedSessionService — while an unreachable API just
   * throws, leaving a still-valid session (and the user's wallet) alone.
   *
   * Clearing the token up front instead would burn a signature on every failure
   * that was never about auth: an offline blip, a per-address cap, a failed join.
   */
  private scheduleReauth(): void {
    if (this.reconnectTimer || this.stopped) return;
    const runId = this.lifecycle.currentRun;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      if (!this.lifecycle.owns(runId)) return;
      this.ladder.noteReauth();
      try {
        this.log('socket rejected twice — revalidating the session…');
        await this.get(`/${this.opts.address}/feed/unread-count`);
        // The probe outliving a restart is the same trap as doStart's: `stopped`
        // is false again, so only run ownership stops this rebuilding a socket
        // the new run already owns.
        if (!this.lifecycle.owns(runId)) return;
        this.connectSocket();
      } catch (e) {
        this.log('socket re-auth failed; feed still works via REST', e);
      }
    }, 1500);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * On tab-return, if the socket dropped while backgrounded, re-sync from REST and
   * reconnect with the EXISTING token before any re-sign — so returning to a tab
   * never surprises the user with a wallet prompt for what is just a resumed
   * connection.
   */
  private registerVisibilityHandler(): void {
    if (this.visibilityHandler || typeof document === 'undefined') return;
    this.visibilityHandler = () => {
      if (this.stopped || document.visibilityState !== 'visible') return;
      if (this.socket?.connected || !this.token) return;
      // REST is the source of truth, and this is the one moment we know the live
      // layer is NOT carrying the feed. Without it, a socket that gave up for good
      // (the ladder is deliberately bounded) leaves the feed frozen until a reload
      // — including the case where the reconnect below never succeeds either.
      this.log('tab visible again — re-syncing the feed from REST');
      void this.refresh().catch((e) => this.log('refresh on tab-return failed', e));
      if (this.socket) {
        this.log('tab visible again — reconnecting socket (reusing token)');
        // Re-opens the cheap rung only, so a tab-return gets another token-reuse
        // attempt even after we gave up — with no fresh wallet-prompt budget, and
        // no way to starve escalation: a socket that connects and is kicked right
        // back still climbs the ladder (see RecoveryLadder).
        this.ladder.allowCheapRetry();
        this.socket.connect();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private unregisterVisibilityHandler(): void {
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    this.visibilityHandler = null;
  }

  // ── debug watchdog (kept intentionally) ────────────────────────────────────

  private startWatchdog(socket: Socket): void {
    // Diagnostics only: a 3s interval per connection attempt plus a line per tick.
    if (!this.opts.debug) return;
    const mgr = socket.io as unknown as {
      on: (e: string, cb: (x?: unknown) => void) => void;
      engine?: { transport?: { name?: string }; readyState?: string };
    };
    mgr.on('error', (e) => this.log(`manager error: ${(e as Error)?.message ?? String(e)}`));
    // Confirm which transport config actually took effect.
    this.log(
      `socket manager opts: transports=${JSON.stringify(
        (socket.io as unknown as { opts?: { transports?: unknown } }).opts?.transports,
      )} upgrade=${(socket.io as unknown as { opts?: { upgrade?: unknown } }).opts?.upgrade}`,
    );
    const started = Date.now();
    this.watchdogTimer = setInterval(() => {
      if (socket.connected || this.socket !== socket || Date.now() - started > 20_000) {
        this.clearWatchdog();
        return;
      }
      this.log(
        `socket still not connected after ${Math.round((Date.now() - started) / 1000)}s`
          + ` — active=${socket.active} transport=${mgr.engine?.transport?.name ?? 'none'}`
          + ` engineState=${mgr.engine?.readyState ?? 'none'}`,
      );
    }, 3000);
  }

  private clearWatchdog(): void {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  // ── native browser push (VAPID) ─────────────────────────────────────────

  /**
   * Which address currently owns this browser's push endpoint — ONE record per
   * (baseUrl), not one per account.
   *
   * A `PushSubscription` belongs to the BROWSER, and the server's subscription
   * table keys on the endpoint, so exactly one address can be registered for it
   * at a time: whoever POSTed last. The stored record has to mirror that
   * exclusivity. Keying it per address instead let every account that had ever
   * enabled push keep a marker naming the same endpoint, so all of them reported
   * "subscribed" and each one's start() re-POSTed the endpoint back under itself —
   * ownership flip-flopping on every connect, with push landing on whichever
   * account happened to reconnect last.
   */
  private pushOwnerKey(): string {
    return `sh:notif:push-owner:${this.opts.baseUrl}`;
  }

  /** Legacy per-address marker, superseded by {@link pushOwnerKey}. */
  private legacyPushMarkerKey(): string {
    return `sh:notif:push-owner:${this.opts.baseUrl}:${this.opts.address}`;
  }

  private loadPushOwner(): { endpoint: string; address: string } | null {
    try {
      const raw = typeof window !== 'undefined'
        ? window.localStorage.getItem(this.pushOwnerKey())
        : null;
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { endpoint?: string; address?: string };
      return parsed?.endpoint && parsed?.address
        ? { endpoint: parsed.endpoint, address: parsed.address }
        : null;
    } catch {
      // Deliberately no fall-back to the legacy per-address marker: reading it
      // would resurrect the ambiguity above. An account that had push enabled
      // before this record existed just sees the enable-push hint once, and
      // enabling re-uses the browser's existing subscription (no new prompt).
      return null;
    }
  }

  /** True when THIS address is the registered owner of `endpoint`. */
  private ownsPushEndpoint(endpoint: string): boolean {
    const owner = this.loadPushOwner();
    return !!owner && owner.endpoint === endpoint && owner.address === this.opts.address;
  }

  /** Record this address as the owner — transferring it away from any other. */
  private savePushOwner(endpoint: string): void {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(
        this.pushOwnerKey(),
        JSON.stringify({ endpoint, address: this.opts.address }),
      );
      window.localStorage.removeItem(this.legacyPushMarkerKey());
    } catch {
      /* ignore quota / disabled storage */
    }
  }

  /** Drop the ownership record, but only if it is ours to drop. */
  private clearPushOwner(): void {
    try {
      if (typeof window === 'undefined') return;
      window.localStorage.removeItem(this.legacyPushMarkerKey());
      const owner = this.loadPushOwner();
      if (owner && owner.address !== this.opts.address) return;
      window.localStorage.removeItem(this.pushOwnerKey());
    } catch {
      /* ignore */
    }
  }

  /** Current push state without prompting the user. */
  async getPushState(): Promise<PushState> {
    if (!isPushSupported()) return 'unsupported';
    if (Notification.permission === 'denied') return 'denied';
    try {
      const reg = await navigator.serviceWorker.getRegistration('/');
      const sub = await reg?.pushManager.getSubscription();
      // Only report "subscribed" when THIS address is the registered owner of this
      // exact endpoint (see pushOwnerKey) — not just any account that once was.
      if (
        sub
        && Notification.permission === 'granted'
        && this.ownsPushEndpoint(sub.endpoint)
      ) {
        return 'subscribed';
      }
    } catch {
      /* fall through */
    }
    return 'default';
  }

  /**
   * Enable browser push: register the SW, request permission, subscribe with the
   * server VAPID key, and register the subscription under the bearer. MUST be
   * called from a user gesture (permission prompt requirement).
   */
  async enablePush(): Promise<PushState> {
    if (!isPushSupported()) return 'unsupported';

    const publicKey = await this.getVapidPublicKey();
    if (!publicKey) return 'unconfigured';

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'default';
    // That prompt can sit unanswered for minutes — by far the widest window an
    // account switch can land in. Bail before touching the BROWSER's subscription,
    // which is shared by every account here: a stale re-subscribe (e.g. after a
    // VAPID rotation) would rotate the endpoint out from under whoever is on screen
    // now. Throwing rather than returning a state keeps the return value honest;
    // useNotifications discards results from a client it no longer holds.
    if (this.stopped) throw new Error('notifications client stopped before push subscribe');

    // `register` is a TrustedScriptURL sink: under the enforcing CSP a bare string here throws
    // rather than registering, which would kill push for every user who granted permission.
    const reg = await navigator.serviceWorker.register(trustedScriptUrl('/notifications-sw.js'), {
      scope: '/',
    });
    await navigator.serviceWorker.ready;

    const appServerKey = urlBase64ToUint8Array(publicKey);
    let sub = await reg.pushManager.getSubscription();
    // If a subscription exists but was made with a DIFFERENT VAPID key (server
    // key rotated), it can never receive our pushes — drop and re-subscribe.
    if (sub && !applicationServerKeyMatches(sub, appServerKey)) {
      await sub.unsubscribe();
      sub = null;
    }
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey as BufferSource,
      });
    }

    const json = sub.toJSON() as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      throw new Error('Push subscription missing endpoint/keys');
    }

    await this.registerSubscription(json.endpoint, json.keys.p256dh, json.keys.auth);
    return 'subscribed';
  }

  /**
   * POST an endpoint under the bearer and record this address as its owner.
   *
   * Both halves are gated on the client still being live, because both write state
   * SHARED by every account in this browser: the server keys its subscription row
   * on the endpoint (one endpoint, one address — whoever POSTed last), and the local
   * owner record has to mirror that. All three callers get here across at least one
   * await an account switch can land inside — enablePush()'s OS permission prompt is
   * the widest and can sit for minutes — and stop() does NOT invalidate the cached
   * session, so the POST is still authorized afterwards.
   *
   * Ungated, the account the user just LEFT wins: its late POST re-points this
   * browser's push at itself and its savePushOwner overwrites the record the new
   * account just wrote. The new account's UI still reads "subscribed" while the OS
   * notifications go to the old one.
   *
   * `stopped` rather than run ownership (unlike doStart/doRefresh): a stop()+start()
   * is the same address, and re-pointing the endpoint at it is idempotent — there is
   * no duplicate socket or clobbered feed to avoid here, so keying off the run would
   * only add a way for a legitimate enable to silently do nothing.
   */
  private async registerSubscription(
    endpoint: string,
    p256dh: string,
    auth: string,
  ): Promise<void> {
    if (this.stopped) return;
    // Resolve the session BEFORE deciding to send. post() awaits it internally, and
    // a teardown landing in that await would otherwise still get the request out the
    // door — which is exactly what happens on the worker's fire-and-forget rotation
    // handoff, where the entry check above runs synchronously with the event.
    await this.ensureSession();
    if (this.stopped) return;
    await this.post(`/${this.opts.address}/web-push/subscription`, {
      endpoint,
      keys: { p256dh, auth },
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    });
    // Re-checked after the await: the switch can land while the POST is in flight,
    // and every client instance in this browser reads the record below.
    if (this.stopped) return;
    // The server upsert just re-pointed this endpoint at this address; record the
    // transfer so the account that held it before stops claiming it.
    this.savePushOwner(endpoint);
  }

  /**
   * Re-POST this browser's push subscription on start, when this address already
   * owns it.
   *
   * Cheap (the server upserts by endpoint) and it repairs the failures the local
   * marker cannot see, all of which are silent today — the bell keeps reporting
   * "subscribed" while the server has no row for this address and no OS
   * notification ever arrives again:
   *   - the backend pruned the endpoint after a push service 404/410
   *     (send-web-push.queue), while the browser still reports a subscription;
   *   - ANOTHER account in this browser enabled push and the server's upsert
   *     re-pointed the endpoint to it (one endpoint belongs to one address);
   *   - the worker re-subscribed on `pushsubscriptionchange` with no tab open, so
   *     nobody was around to register the replacement.
   *
   * getPushState() === 'subscribed' is the gate, which is also the consent gate:
   * an address that never enabled push here must not silently inherit it.
   */
  private async reassertPushSubscription(): Promise<void> {
    try {
      if ((await this.getPushState()) !== 'subscribed') return;
      const reg = await navigator.serviceWorker.getRegistration('/');
      const sub = await reg?.pushManager.getSubscription();
      const json = sub?.toJSON() as
        | { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
        | undefined;
      if (!json?.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
      if (this.stopped) return; // account switch landed mid-check
      await this.registerSubscription(json.endpoint, json.keys.p256dh, json.keys.auth);
      this.log('re-asserted this browser\'s push subscription for the active address');
    } catch (e) {
      // Best effort: the feed itself must not fail because push is stale.
      this.log('push subscription re-assert failed (browser push may be stale)', e);
    }
  }

  /**
   * Authenticated half of the `pushsubscriptionchange` handoff: the worker can
   * re-create a rotated subscription but cannot register it (no access to the
   * bearer session), so it postMessages the replacement instead.
   */
  private registerSwMessageHandler(): void {
    if (this.swMessageHandler || !isPushSupported()) return;
    const sw = navigator.serviceWorker;
    if (typeof sw?.addEventListener !== 'function') return;
    this.swMessageHandler = (event: MessageEvent) => {
      const msg = event.data as {
        type?: string;
        oldEndpoint?: string;
        subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      } | null;
      if (!msg || msg.type !== 'superhero:push-subscription-changed') return;
      // stop() detaches this listener, so this is a backstop rather than the primary
      // guard — but "a stopped client never acts" should hold structurally, not by
      // trusting that removeEventListener won a race with an in-flight event.
      if (this.stopped) return;
      // Only the address that owned the replaced endpoint may re-register it: a
      // subscription is per BROWSER, so another account's tab must not silently
      // take over this browser's OS-level push (see pushOwnerKey).
      const owner = this.loadPushOwner();
      if (!owner || owner.address !== this.opts.address) return;
      if (msg.oldEndpoint && msg.oldEndpoint !== owner.endpoint) return;
      const json = msg.subscription;
      if (!json?.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;
      void this.registerSubscription(json.endpoint, json.keys.p256dh, json.keys.auth)
        .then(() => this.log('registered a rotated push subscription'))
        .catch((e) => this.log('failed to register a rotated push subscription', e));
    };
    sw.addEventListener('message', this.swMessageHandler);
  }

  private unregisterSwMessageHandler(): void {
    const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined;
    if (this.swMessageHandler && typeof sw?.removeEventListener === 'function') {
      sw.removeEventListener('message', this.swMessageHandler);
    }
    this.swMessageHandler = null;
  }

  /** Unsubscribe locally and tell the server to drop the endpoint. */
  async disablePush(): Promise<void> {
    if (!isPushSupported()) return;
    const reg = await navigator.serviceWorker.getRegistration('/');
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    const { endpoint } = sub;
    // The browser subscription is shared, and another address may currently own it
    // (see pushOwnerKey). Unsubscribing would silently kill THEIR push and the
    // DELETE would drop THEIR server row, so leave both alone and just make sure
    // we are not the claimant.
    if (!this.ownsPushEndpoint(endpoint)) {
      this.clearPushOwner();
      this.log('push is owned by another account in this browser — nothing to disable');
      return;
    }
    try {
      await sub.unsubscribe();
    } finally {
      this.clearPushOwner();
      await this.post(`/${this.opts.address}/web-push/subscription`, { endpoint }, 'DELETE').catch(
        (e) => this.log('server unsubscribe failed', e),
      );
    }
  }

  private async getVapidPublicKey(): Promise<string | null> {
    // Public route — no bearer needed.
    const res = await this.doFetch(
      `${this.opts.baseUrl}/api/notifications/web-push/vapid-public-key`,
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { publicKey: string | null };
    return body.publicKey || null;
  }

  // ── fetch helpers (bearer header, never a cookie) ──────────────────────────

  private doFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return (this.opts.fetch ?? fetch)(input, init);
  }

  private get<T>(path: string): Promise<T> {
    return this.authedRequest<T>('GET', path);
  }

  private post<T>(path: string, body?: unknown, method: 'POST' | 'DELETE' = 'POST'): Promise<T> {
    return this.authedRequest<T>(method, path, body);
  }

  /** Authorized request with a single transparent re-bootstrap on 401. */
  private async authedRequest<T>(
    method: string,
    path: string,
    body?: unknown,
    retried = false,
  ): Promise<T> {
    const token = await this.ensureSession();
    const res = await this.doFetch(`${this.opts.baseUrl}/api/notifications${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.status === 401 && !retried) {
      // A stopped client must not pop a wallet signature for an account the user
      // has already left, nor bin that account's cached session on the way out —
      // an account switch can land while any of these requests is in flight
      // (refresh, markRead, the reauth probe, the push re-assert). Reads with an
      // already-cached token stay allowed on purpose (see stop()).
      if (this.stopped) {
        throw new Error(`notifications ${method} ${path} -> 401 (client stopped)`);
      }
      // Session expired/revoked — clear, re-sign once, retry exactly once.
      this.clearCachedToken();
      await this.ensureSession(true);
      return this.authedRequest<T>(method, path, body, true);
    }
    if (!res.ok) {
      throw new Error(`notifications ${method} ${path} -> ${res.status}`);
    }
    return parseJson<T>(res);
  }

  /** Unauthenticated POST used only by the two bootstrap routes. */
  private async rawPost<T>(path: string, body?: unknown): Promise<T> {
    const res = await this.doFetch(`${this.opts.baseUrl}/api/notifications${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`notifications POST ${path} -> ${res.status}`);
    }
    return parseJson<T>(res);
  }

  /** All logging (incl. the kept debug output) routes through here. */
  private log(msg: string, err?: unknown): void {
    if (this.opts.log) {
      this.opts.log(msg, err);
      return;
    }
    // Failures are worth reporting anywhere. The running commentary — every
    // connect, every live item, the session token's tail — is diagnostic, so it
    // stays out of production consoles.
    if (err !== undefined) console.warn(`[notifications] ${msg}`, err);
    else if (this.opts.debug) console.info(`[notifications] ${msg}`);
  }
}

// ── module helpers (exported for direct unit testing) ─────────────────────────

/** Keep newest-first order; first occurrence of each id wins. */
export function dedupeById(items: FeedItem[]): FeedItem[] {
  const seen = new Set<number>();
  return items.filter((it) => (seen.has(it.id) ? false : (seen.add(it.id), true)));
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  return (text ? JSON.parse(text) : {}) as T;
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
  );
}

/** True if an existing subscription was created with the given VAPID key. */
function applicationServerKeyMatches(
  sub: PushSubscription,
  key: Uint8Array,
): boolean {
  const existing = sub.options?.applicationServerKey;
  if (!existing) return false;
  const a = new Uint8Array(existing as ArrayBuffer);
  if (a.length !== key.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== key[i]) return false;
  }
  return true;
}

/** Standard VAPID base64url -> Uint8Array for applicationServerKey. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  // Back the view with a concrete ArrayBuffer so the result is a valid
  // BufferSource for pushManager.subscribe under strict DOM typings.
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}
