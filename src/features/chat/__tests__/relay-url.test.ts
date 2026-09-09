import { describe, it, expect } from 'vitest';

import { ensureSecureRelayUrl } from '../nostr/relay-url';

/** A PWA over https cannot open a ws:// socket. */
describe('ensureSecureRelayUrl', () => {
  it('accepts wss:// unchanged', () => {
    expect(ensureSecureRelayUrl('wss://relay.example:8080')).toBe(
      'wss://relay.example:8080',
    );
  });

  it('rejects a non-loopback ws:// relay', () => {
    expect(() => ensureSecureRelayUrl('ws://136.243.173.251:8080')).toThrow(
      /insecure relay URL/i,
    );
  });

  it('allows ws:// only on the loopback host (dev)', () => {
    expect(ensureSecureRelayUrl('ws://localhost:8080')).toBe(
      'ws://localhost:8080',
    );
    expect(ensureSecureRelayUrl('ws://127.0.0.1:8080')).toBe(
      'ws://127.0.0.1:8080',
    );
  });

  it('rejects a malformed URL', () => {
    expect(() => ensureSecureRelayUrl('not a url')).toThrow(/invalid relay url/i);
  });
});
