/**
 * Deploy-time Nostr relay configuration — the single source shared by the client
 * and the server CSP.
 *
 * No relay is hardcoded. The production server substitutes the `NOSTR_RELAY_URLS`
 * env var into `window.__SUPERCONFIG__` (see `server/index.cjs` `envInject`) and
 * folds each relay origin into the CSP `connect-src` (same file, `buildConnectSrc`),
 * so the browser can only open a socket the header already permits. Reading the
 * same value here keeps the two lists from ever disagreeing.
 *
 * The value is a comma-separated list of `wss://` origins (P2P default plus the
 * `groups_relay` origin the API hands out for token-gated rooms). When it is
 * empty, chat ships "dark": no default relay, entry points render an explicit
 * unavailable state, and the origin gate rejects every relay.
 */
import { CONFIG } from '@/config';
import type { RelayDict } from './types';
import { ensureSecureRelayUrl } from '../nostr/relay-url';

/** Origin of a URL, or `null` when it does not parse. */
function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** True when a relay passes the `wss://`-only (loopback `ws://` in dev) scheme guard. */
function isSecureRelay(url: string): boolean {
  try {
    ensureSecureRelayUrl(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * The configured relay URLs: the comma list parsed, trimmed, passed through the
 * scheme guard, and de-duplicated by origin. A malformed or insecure entry is
 * dropped rather than allowed to poison the list.
 */
export function configuredRelayUrls(): string[] {
  const raw = CONFIG.NOSTR_RELAY_URLS;
  if (!raw) return [];
  const seen = new Set<string>();
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter((url) => url.length > 0 && isSecureRelay(url))
    .filter((url) => {
      const origin = originOf(url);
      if (!origin || seen.has(origin)) return false;
      seen.add(origin);
      return true;
    });
}

/** The set of allowed relay origins, for the origin gate. */
function allowedRelayOrigins(): Set<string> {
  return new Set(
    configuredRelayUrls()
      .map((url) => originOf(url))
      .filter((origin): origin is string => origin != null),
  );
}

/** True when a relay is configured for this deployment. */
export function isChatRelayConfigured(): boolean {
  return configuredRelayUrls().length > 0;
}

/**
 * True when `url`'s origin is in the deploy-time allowlist. The gate applied to
 * the API-supplied room relay, user-added relays, and the persisted relay set —
 * so a relay CSP would silently kill at connect time is refused up front instead.
 */
export function isAllowedRelayOrigin(url: string): boolean {
  const origin = originOf(url);
  return origin != null && allowedRelayOrigins().has(origin);
}

/** The default relay set: every configured relay, read+write. `{}` when unset. */
export function defaultRelays(): RelayDict {
  return Object.fromEntries(
    configuredRelayUrls().map((url) => [url, { read: true, write: true }]),
  );
}

/** Drop any relay whose origin is off the allowlist (transport safety net). */
export function filterAllowedRelays(relays: RelayDict): RelayDict {
  return Object.fromEntries(
    Object.entries(relays).filter(([url]) => isAllowedRelayOrigin(url)),
  );
}
