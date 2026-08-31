/**
 * Relay-URL scheme guard.
 *
 * A PWA served over `https://` cannot open a plaintext `ws://` socket — the
 * browser blocks it as mixed content, so a relay that comes back over `ws://`
 * (including `getRoomConfig().relay_url`) would fail opaquely at connect time.
 * Anything that resolves a relay URL runs it through here FIRST so a non-TLS
 * scheme is rejected with a clear message instead of a silent socket failure.
 *
 * `ws://localhost` / `ws://127.0.0.1` are allowed: a dev relay on the loopback
 * origin is not mixed content and is the local-development path. Every other
 * `ws://` host is refused.
 */

function isLoopbackHost(host: string): boolean {
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

/**
 * Return `url` when it is safe to open from an https PWA, otherwise throw.
 * Accepts `wss://` unconditionally and `ws://` only on the loopback host.
 */
export function ensureSecureRelayUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid relay URL: ${url}`);
  }
  if (parsed.protocol === 'wss:') return url;
  if (parsed.protocol === 'ws:' && isLoopbackHost(parsed.hostname)) return url;
  throw new Error(
    `Refusing insecure relay URL "${url}": a PWA over https cannot open a ws:// socket. Use wss://.`,
  );
}
