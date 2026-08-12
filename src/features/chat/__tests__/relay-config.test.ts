import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';
import {
  configuredRelayUrls,
  isChatRelayConfigured,
  isAllowedRelayOrigin,
  defaultRelays,
  filterAllowedRelays,
} from '../core/relay-config';

// CONFIG is read at call time inside each helper, so a mutable mock lets one suite
// exercise configured, unset, and malformed deploy values. vitest hoists vi.mock /
// vi.hoisted above the imports, so the mock is registered before relay-config loads.
const { mockConfig } = vi.hoisted(() => ({
  mockConfig: { NOSTR_RELAY_URLS: undefined as string | undefined },
}));
vi.mock('@/config', () => ({ CONFIG: mockConfig }));

beforeEach(() => {
  mockConfig.NOSTR_RELAY_URLS = undefined;
});

describe('relay-config', () => {
  it('ships dark when NOSTR_RELAY_URLS is unset', () => {
    expect(configuredRelayUrls()).toEqual([]);
    expect(isChatRelayConfigured()).toBe(false);
    expect(defaultRelays()).toEqual({});
    expect(isAllowedRelayOrigin('wss://relay.example.com')).toBe(false);
  });

  it('parses a comma list, trims, and de-duplicates by origin', () => {
    mockConfig.NOSTR_RELAY_URLS = ' wss://relay.one.example , wss://relay.two.example , wss://relay.one.example ';
    expect(configuredRelayUrls()).toEqual([
      'wss://relay.one.example',
      'wss://relay.two.example',
    ]);
    expect(isChatRelayConfigured()).toBe(true);
  });

  it('drops insecure or malformed entries rather than allowing them', () => {
    mockConfig.NOSTR_RELAY_URLS = 'wss://ok.example, ws://evil.example, not a url, http://nope.example';
    expect(configuredRelayUrls()).toEqual(['wss://ok.example']);
  });

  it('gates origins against the configured list', () => {
    mockConfig.NOSTR_RELAY_URLS = 'wss://relay.superhero.example, wss://groups.superhero.example:8080';
    expect(isAllowedRelayOrigin('wss://relay.superhero.example')).toBe(true);
    expect(isAllowedRelayOrigin('wss://relay.superhero.example/path')).toBe(true);
    expect(isAllowedRelayOrigin('wss://groups.superhero.example:8080')).toBe(true);
    expect(isAllowedRelayOrigin('wss://groups.superhero.example')).toBe(false); // wrong port ⇒ different origin
    expect(isAllowedRelayOrigin('wss://attacker.example')).toBe(false);
  });

  it('seeds the default relay set read+write from the configured list', () => {
    mockConfig.NOSTR_RELAY_URLS = 'wss://relay.one.example';
    expect(defaultRelays()).toEqual({
      'wss://relay.one.example': { read: true, write: true },
    });
  });

  it('filters a persisted relay set down to allowlisted origins', () => {
    mockConfig.NOSTR_RELAY_URLS = 'wss://keep.example';
    const persisted = {
      'wss://keep.example': { read: true, write: true },
      'wss://drop.example': { read: true, write: false },
    };
    expect(filterAllowedRelays(persisted)).toEqual({
      'wss://keep.example': { read: true, write: true },
    });
  });
});
