import { describe, it, expect } from 'vitest';

import {
  validateRelayUrl,
  normalizeRelayUrl,
  getRelayDescription,
  addRelay,
  removeRelay,
  setRelayFlag,
} from '../nostr/relays';

describe('validateRelayUrl', () => {
  it('accepts a wss:// relay', () => {
    expect(validateRelayUrl('wss://relay.damus.io')).toBe(true);
  });

  it('rejects a non-loopback ws:// relay (mixed content on the https PWA)', () => {
    expect(validateRelayUrl('ws://relay.example.com')).toBe(false);
  });

  it('allows ws:// on the loopback host for local development', () => {
    expect(validateRelayUrl('ws://localhost:8080')).toBe(true);
  });

  it('rejects a malformed URL', () => {
    expect(validateRelayUrl('not a url')).toBe(false);
  });
});

describe('normalizeRelayUrl', () => {
  it('strips a trailing slash so a relay is not stored under two keys', () => {
    expect(normalizeRelayUrl('wss://relay.damus.io/')).toBe('wss://relay.damus.io');
  });

  it('returns the input unchanged when it cannot be parsed', () => {
    expect(normalizeRelayUrl('garbage')).toBe('garbage');
  });
});

describe('getRelayDescription', () => {
  it('describes a known relay', () => {
    expect(getRelayDescription('wss://relay.damus.io')).toMatch(/Damus/);
  });

  it('falls back to a generic label for an unknown relay', () => {
    expect(getRelayDescription('wss://relay.unknown.example')).toBe('Community relay');
  });
});

describe('relay dict mutators', () => {
  it('adds a normalized relay without mutating the input', () => {
    const base = {};
    const next = addRelay(base, 'wss://relay.damus.io/', true, false);
    expect(next).toEqual({ 'wss://relay.damus.io': { read: true, write: false } });
    expect(base).toEqual({});
  });

  it('throws when adding an insecure relay', () => {
    expect(() => addRelay({}, 'ws://relay.example.com')).toThrow(/wss:\/\//);
  });

  it('removes a relay by its normalized URL', () => {
    const base = { 'wss://a.example': { read: true, write: true } };
    expect(removeRelay(base, 'wss://a.example/')).toEqual({});
  });

  it('flips a single flag and leaves the rest intact', () => {
    const base = { 'wss://a.example': { read: true, write: true } };
    expect(setRelayFlag(base, 'wss://a.example', 'write', false)).toEqual({
      'wss://a.example': { read: true, write: false },
    });
  });

  it('is a no-op when the relay is not present', () => {
    const base = { 'wss://a.example': { read: true, write: true } };
    expect(setRelayFlag(base, 'wss://missing.example', 'read', false)).toBe(base);
  });
});
