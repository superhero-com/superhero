/**
 * React binding for {@link NotificationFeedClient}. Wires the æternity SDK
 * (active account + wallet message signing) and the configured API origin into
 * one client instance per connected account, and exposes the reconciled feed
 * state to the UI.
 *
 * Nothing here signs or connects automatically — the caller triggers `connect()`
 * from a user gesture, so the wallet prompt is never a surprise on page load.
 */
import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { useAeSdk, useWalletConnect } from '@/hooks';
import { useWalletReconnect } from '@/hooks/useWalletReconnect';
import { CONFIG } from '@/config';
import { signAndVerifyLinkMessage } from '@/utils/signLinkMessage';
import { normalizeAddress } from '@/utils/walletSdk';
import {
  NotificationFeedClient,
  isPushSupported,
  type FeedItem,
  type PushState,
} from './notification-feed-client';

function apiBaseUrl(): string {
  // Allow pointing ONLY the notifications backend at a local API (e.g.
  // http://localhost:3000) for testing, without repointing the whole app's API
  // (OpenAPI.BASE) via VITE_SUPERHERO_API_URL. Falls back to the app API origin.
  const override = (import.meta as any)?.env?.VITE_NOTIFICATIONS_API_URL as
    | string
    | undefined;
  return (override || CONFIG.SUPERHERO_API_URL || CONFIG.BACKEND_URL || '').replace(
    /\/$/,
    '',
  );
}

export interface UseNotifications {
  /** Whether a session is bootstrapped and the socket is (or is being) opened. */
  connected: boolean;
  connecting: boolean;
  error: string | null;
  items: FeedItem[];
  unreadCount: number;
  pushState: PushState;
  pushSupported: boolean;
  /** Bootstrap session (one signature) + open the live socket. User-gesture. */
  connect: () => Promise<void>;
  /** Tear down the socket (e.g. on logout). */
  disconnect: () => void;
  /**
   * Re-sync the feed + unread count from REST, the source of truth. No-op when no
   * session exists yet, so it can never trigger a wallet prompt. Call it when the
   * user opens the feed: the live socket is best-effort and gives up after a
   * bounded number of failures, and this is the path that still works after it has.
   */
  refresh: () => Promise<void>;
  /** Mark some or (default) all items read. */
  markRead: (ids?: number[]) => Promise<void>;
  /** Enable native browser push. User-gesture (permission prompt). */
  enablePush: () => Promise<void>;
  /** Unsubscribe browser push. */
  disablePush: () => Promise<void>;
  /** The most recent live item, for a raw alert/toast in the MVP UI. */
  lastLive: FeedItem | null;
}

export function useNotifications(): UseNotifications {
  const {
    activeAccount,
    aeSdk,
    addStaticAccount,
    signMessage,
  } = useAeSdk();
  const {
    connectWallet,
    walletConnected,
    walletInfo,
    connectingWallet,
  } = useWalletConnect();

  // Re-establish the wallet RPC session before signing. This is the piece that
  // makes the extension popup actually appear: `signMessage` only prompts when
  // the aepp SDK has a LIVE connection to the wallet. `requireWalletConnectedForSigner`
  // forces a real `connectWallet()` when the session is dormant (walletInfo
  // persisted but not connected), instead of silently falling back to the
  // deep-link flow. Same config as the sponsored-claim flow (useClaimChainName).
  const waitForWalletReconnect = useWalletReconnect({
    activeAccount,
    signerSdks: [aeSdk],
    walletConnected,
    walletInfo,
    connectingWallet,
    connectWallet,
    restoreAccount: addStaticAccount,
    requireWalletConnectedForSigner: true,
  });

  // Keep the latest identities in refs so the signer callback below can stay
  // STABLE (`[]` deps). If it changed identity per render, the client-rebuild
  // effect (which depends on it and calls setState) would loop forever.
  const activeAccountRef = useRef<string | undefined>(activeAccount);
  activeAccountRef.current = activeAccount;
  const addStaticAccountRef = useRef(addStaticAccount);
  addStaticAccountRef.current = addStaticAccount;
  const signMessageRef = useRef(signMessage);
  signMessageRef.current = signMessage;
  const waitForWalletReconnectRef = useRef(waitForWalletReconnect);
  waitForWalletReconnectRef.current = waitForWalletReconnect;

  // The signer the feed client uses to mint its session. Same schema as the
  // sponsored-claim / profile flows: wake the wallet RPC session (so the
  // extension shows its signing popup), register the account on the static SDK
  // (so the mobile wallet deep-link signer is available), then sign AND locally
  // verify the challenge — returning a normalized hex signature the backend
  // accepts (it verifies with the same `verifyAeAddressSignature` util).
  const signNotificationMessage = useCallback(async (message: string): Promise<string> => {
    const requested = activeAccountRef.current;
    if (!requested) throw new Error('Connect your wallet to enable notifications');
    // Reconnect resolves the address the wallet actually signs with; sign for it
    // so a local re-verify against a stale active account can't fail spuriously.
    const target = await waitForWalletReconnectRef.current(requested);
    if (normalizeAddress(target) !== normalizeAddress(requested)) {
      throw new Error('Connected wallet account changed; reconnect to enable notifications');
    }
    try {
      await addStaticAccountRef.current?.(target);
    } catch {
      // Non-fatal: signing can still go through the active wallet session.
    }
    return signAndVerifyLinkMessage(target, signMessageRef.current, message);
  }, []);

  const clientRef = useRef<NotificationFeedClient | null>(null);
  /**
   * The client instance whose start() has already been issued.
   *
   * The "am I already connecting/connected?" guard has to be a ref, not the
   * `connected`/`connecting` state: it is read by callbacks that must stay stable
   * (the auto-connect effect depends on `connect`), and it is set SYNCHRONOUSLY, so
   * an auto-connect and a click landing in the same tick cannot both call start()
   * — which is a full re-bootstrap, not a no-op.
   */
  const startedClientRef = useRef<NotificationFeedClient | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushState, setPushState] = useState<PushState>('default');
  const [lastLive, setLastLive] = useState<FeedItem | null>(null);

  // Rebuild the client whenever the account (or signer) changes; tear down the
  // previous account's socket so notifications never cross accounts.
  useEffect(() => {
    clientRef.current?.stop();
    clientRef.current = null;
    startedClientRef.current = null;
    setConnected(false);
    setConnecting(false);
    setItems([]);
    setUnreadCount(0);
    setLastLive(null);
    setError(null);
    // Push subscriptions are per-account (see notification-feed-client's
    // pushMarkerKey) — don't carry the previous account's state over while the
    // new client's getPushState() recomputes.
    setPushState('default');

    if (!activeAccount) return undefined;

    clientRef.current = new NotificationFeedClient({
      baseUrl: apiBaseUrl(),
      address: activeAccount,
      signMessage: signNotificationMessage,
      onItems: setItems,
      onUnreadCount: setUnreadCount,
      onNotification: (item) => setLastLive(item),
      debug: !!(import.meta as any)?.env?.DEV,
    });

    return () => {
      clientRef.current?.stop();
      clientRef.current = null;
      startedClientRef.current = null;
    };
  }, [activeAccount, signNotificationMessage]);

  // Reflect the current push subscription state once a client exists. Depends on
  // activeAccount too (not just connected) — switching between two accounts that
  // are both currently disconnected wouldn't otherwise toggle `connected` and the
  // freshly reset 'default' would never get recomputed against the new account's
  // own marker (see notification-feed-client's pushMarkerKey).
  useEffect(() => {
    clientRef.current?.getPushState().then(setPushState).catch(() => {});
  }, [connected, activeAccount]);

  const connect = useCallback(async () => {
    const client = clientRef.current;
    if (!client || startedClientRef.current === client) return;
    startedClientRef.current = client;
    setConnecting(true);
    setError(null);
    try {
      await client.start();
      // The active account can change while a wallet signature is in flight —
      // the account-change effect then swaps clientRef to a different (or no)
      // client. This call's `client` is now stale: it finished starting, but
      // it's not the account the UI currently shows, so its connected/pushState
      // must not be applied (that effect already reset those for the new
      // account, and applying this would incorrectly mark it "connected").
      if (clientRef.current !== client) return;
      const nextPushState = await client.getPushState();
      if (clientRef.current !== client) return;
      setConnected(true);
      setPushState(nextPushState);
    } catch (e) {
      // Release the guard so the CTA can retry this same client.
      if (startedClientRef.current === client) startedClientRef.current = null;
      if (clientRef.current === client) {
        setError(e instanceof Error ? e.message : 'Failed to connect notifications');
      }
    } finally {
      if (clientRef.current === client) setConnecting(false);
    }
  }, []);

  // Auto-connect when a session is already cached. `start()` reuses it with no
  // wallet interaction (see NotificationFeedClient.hasCachedSession), so the
  // "never prompt on page load" rule is not at stake — there is no prompt to make.
  // Without this the bell reads zero unread on every reload for a user who has
  // already enabled notifications: `connected` gates the badge and the list, and
  // only a click used to set it. Push subscribers felt it worst — an OS
  // notification would open the app onto an apparently empty feed.
  useEffect(() => {
    if (!clientRef.current?.hasCachedSession()) return;
    // connect() reports its own failures through `error`, so there is nothing to
    // handle here; the catch only exists so this can never become an unhandled
    // rejection if that changes.
    connect().catch(() => {});
  }, [activeAccount, connect]);

  const disconnect = useCallback(() => {
    clientRef.current?.stop();
    // Deliberately reopened: stop() leaves the client restartable (the cached
    // session survives), so the CTA has to be able to start it again.
    startedClientRef.current = null;
    setConnected(false);
  }, []);

  const markRead = useCallback(async (ids?: number[]) => {
    await clientRef.current?.markRead(ids);
  }, []);

  const refresh = useCallback(async () => {
    const client = clientRef.current;
    // Never let a UI-triggered refresh MINT a session: opening the panel must not
    // pop a wallet signature. With no session cached there is nothing to re-sync
    // anyway — the panel shows the connect CTA instead.
    if (!client?.hasCachedSession()) return;
    await client.refresh();
  }, []);

  const enablePush = useCallback(async () => {
    const client = clientRef.current;
    if (!client) return;
    setError(null);
    try {
      // Ensure a session exists first so the subscribe POST is authorized. Keyed
      // off the ref rather than `connected`, which lags a tick behind an
      // auto-connect that has already started this client — restarting it here
      // would tear down a live socket and rebuild it for nothing.
      if (startedClientRef.current !== client) {
        startedClientRef.current = client;
        await client.start();
        // The active account can change during start() / the permission prompt /
        // subscribe; the account-change effect then swaps clientRef. This stale
        // client's result must not mark the new account connected/subscribed —
        // same guard as connect().
        if (clientRef.current !== client) return;
        setConnected(true);
      }
      const state = await client.enablePush();
      if (clientRef.current !== client) return;
      setPushState(state);
      if (state === 'unconfigured') {
        setError('Browser push is not configured on the server (no VAPID key).');
      } else if (state === 'denied') {
        setError('Browser notifications were blocked in this browser.');
      }
    } catch (e) {
      if (clientRef.current === client) {
        setError(e instanceof Error ? e.message : 'Failed to enable browser push');
      }
    }
  }, []);

  const disablePush = useCallback(async () => {
    setError(null);
    try {
      await clientRef.current?.disablePush();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disable browser push');
    }
    const next = await (clientRef.current?.getPushState()
      ?? Promise.resolve<PushState>('default'));
    setPushState(next);
  }, []);

  return {
    connected,
    connecting,
    error,
    items,
    unreadCount,
    pushState,
    pushSupported: isPushSupported(),
    connect,
    disconnect,
    refresh,
    markRead,
    enablePush,
    disablePush,
    lastLive,
  };
}
