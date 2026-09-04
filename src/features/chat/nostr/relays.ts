/**
 * Relay management helpers for the nostr chat feature.
 *
 * Ported from the mobile app's `src/features/chat/relays.ts`. Two mobile-side
 * defects are fixed here rather than replicated:
 *   1. the mobile file imports its types from a non-existent root-level
 *      `'./types'` and references a `NostrRelay` type that does not exist — the
 *      PWA types live in `../core/types` (`RelayDict`), so we import from there;
 *   2. the helpers were never exported from a shared entry point — the PWA has
 *      no barrel, so the relay-settings view imports these named exports directly
 *      from this module.
 *
 * The PWA runs over `https://`, so a plaintext `ws://` relay is blocked by the
 * browser as mixed content. `validateRelayUrl` and `testRelayConnection` reuse
 * the transport's own {@link ensureSecureRelayUrl} guard, so the settings screen
 * cannot add a relay that would fail opaquely at connect time (loopback `ws://`
 * for local development stays allowed).
 */
import type { RelayDict } from '../core/types';
import { ensureSecureRelayUrl } from './relay-url';

/**
 * Validate a relay URL for use from the https PWA: it must parse and be a
 * `wss://` URL (or `ws://` on the loopback host). Insecure `ws://` hosts fail.
 */
export function validateRelayUrl(url: string): boolean {
  try {
    ensureSecureRelayUrl(url);
    return true;
  } catch {
    return false;
  }
}

/** Remove a trailing slash so the same relay is not stored under two keys. */
export function normalizeRelayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.origin + parsed.pathname.replace(/\/$/, '');
  } catch {
    return url;
  }
}

/**
 * Open a short-lived WebSocket to check the relay is reachable. Resolves rather
 * than rejects so callers can branch on `success`. The secure-URL guard runs
 * first so an insecure `ws://` host fails fast with a clear message.
 */
export function testRelayConnection(
  url: string,
  timeoutMs = 5000,
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    let secureUrl: string;
    try {
      secureUrl = ensureSecureRelayUrl(normalizeRelayUrl(url));
    } catch (error) {
      resolve({ success: false, error: error instanceof Error ? error.message : 'Invalid relay URL' });
      return;
    }

    let settled = false;
    const finish = (result: { success: boolean; error?: string }) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    try {
      const ws = new WebSocket(secureUrl);
      const timeout = setTimeout(() => {
        ws.close();
        finish({ success: false, error: 'Connection timeout' });
      }, timeoutMs);

      ws.onopen = () => {
        clearTimeout(timeout);
        ws.close();
        finish({ success: true });
      };
      ws.onerror = () => {
        clearTimeout(timeout);
        finish({ success: false, error: 'Connection failed' });
      };
    } catch (error) {
      finish({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
}

/** A human-readable label for well-known relays, falling back to a generic one. */
export function getRelayDescription(url: string): string {
  const descriptions: Record<string, string> = {
    'wss://relay.damus.io': 'Damus relay — popular, reliable',
    'wss://nos.lol': 'nos.lol — fast, community-run',
    'wss://relay.snort.social': 'Snort relay — high traffic, read-only recommended',
    'wss://nostr.wine': 'nostr.wine — paid relay with spam filtering',
    'wss://relay.nostr.band': 'nostr.band — reliable with good uptime',
  };
  return descriptions[normalizeRelayUrl(url)] || 'Community relay';
}

/** Add or overwrite a relay, returning a new dict. Throws on an invalid URL. */
export function addRelay(relays: RelayDict, url: string, read = true, write = true): RelayDict {
  const normalized = normalizeRelayUrl(url);
  if (!validateRelayUrl(normalized)) {
    throw new Error('Invalid relay URL: use a wss:// address.');
  }
  return { ...relays, [normalized]: { read, write } };
}

export function removeRelay(relays: RelayDict, url: string): RelayDict {
  const normalized = normalizeRelayUrl(url);
  const next = { ...relays };
  delete next[normalized];
  return next;
}

/** Flip a read/write flag on an existing relay, returning a new dict. */
export function setRelayFlag(
  relays: RelayDict,
  url: string,
  flag: 'read' | 'write',
  value: boolean,
): RelayDict {
  const existing = relays[url];
  if (!existing) return relays;
  return { ...relays, [url]: { ...existing, [flag]: value } };
}
