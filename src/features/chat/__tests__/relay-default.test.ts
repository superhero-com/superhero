import {
  describe, expect, it, vi,
} from 'vitest';

/**
 * Chat relay resolution — default on, overridable, disableable.
 *
 * The relay is a built-in default (`COMMON_CONFIG.NOSTR_RELAY_URLS`) rather than
 * deploy-only config, so chat works on every surface without ops wiring an env
 * var into each one. That creates three cases worth pinning, because the middle
 * two are how a deployment steers chat and the third is easy to break:
 *
 *   1. nothing set          → the default relay, chat live
 *   2. runtime value set    → that relay wins (repoint without a rebuild)
 *   3. runtime value ''     → NO relay, chat dark-ships
 *
 * Case 3 is the subtle one. `isPlaceholder()` treats '' as junk and drops it, so
 * without the `EMPTY_MEANS_OFF` carve-out an operator who blanked the var would
 * silently get the default back and chat would stay live — the opposite of the
 * intent. An unsubstituted '$NOSTR_RELAY_URLS' must still be discarded, since
 * that means a broken deploy rather than "off".
 *
 * CONFIG is resolved once at module load from `window.__SUPERCONFIG__`, so each
 * case needs a fresh module registry.
 */

async function loadConfig(superconfig?: Record<string, unknown>) {
  vi.resetModules();
  if (superconfig === undefined) {
    vi.stubGlobal('window', {});
  } else {
    vi.stubGlobal('window', { __SUPERCONFIG__: superconfig });
  }
  const mod = await import('@/config');
  return mod.CONFIG;
}

const DEFAULT_RELAY = 'wss://relay.superhero.chat';

describe('chat relay resolution', () => {
  it('defaults to the Superhero relay when nothing is configured', async () => {
    const config = await loadConfig();
    expect(config.NOSTR_RELAY_URLS).toBe(DEFAULT_RELAY);
  });

  it('lets a runtime value repoint chat at another relay', async () => {
    const config = await loadConfig({ NOSTR_RELAY_URLS: 'wss://other.example' });
    expect(config.NOSTR_RELAY_URLS).toBe('wss://other.example');
  });

  it('treats an explicitly empty runtime value as "chat off"', async () => {
    // The regression guard for the default: blanking the env var must actually
    // disable chat, not fall back to the built-in relay.
    const config = await loadConfig({ NOSTR_RELAY_URLS: '' });
    expect(config.NOSTR_RELAY_URLS).toBe('');
  });

  it('ignores an unsubstituted $PLACEHOLDER and keeps the default', async () => {
    // A broken deploy (envsubst never ran) is not a request to disable chat.
    const config = await loadConfig({ NOSTR_RELAY_URLS: '$NOSTR_RELAY_URLS' });
    expect(config.NOSTR_RELAY_URLS).toBe(DEFAULT_RELAY);
  });

  it('still discards empty values for keys where empty is not meaningful', async () => {
    // The carve-out must be narrow: only NOSTR_RELAY_URLS opts in, or every
    // blank env var would start clobbering a good default.
    const config = await loadConfig({ SUPERHERO_API_URL: '' });
    expect(config.SUPERHERO_API_URL).toBeTruthy();
    expect(config.SUPERHERO_API_URL).not.toBe('');
  });
});

describe('the relay default is chat-enabling', () => {
  it('passes the relay-configured gate', async () => {
    // The end the user cares about: with no deploy config at all, chat must be
    // considered available, which is what renders the inbox and "New chat".
    vi.resetModules();
    vi.stubGlobal('window', {});
    const { isChatRelayConfigured, configuredRelayUrls } = await import(
      '@/features/chat/core/relay-config'
    );
    expect(isChatRelayConfigured()).toBe(true);
    expect(configuredRelayUrls()).toEqual([DEFAULT_RELAY]);
  });

  it('fails the gate when the relay is explicitly blanked', async () => {
    vi.resetModules();
    vi.stubGlobal('window', { __SUPERCONFIG__: { NOSTR_RELAY_URLS: '' } });
    const { isChatRelayConfigured } = await import('@/features/chat/core/relay-config');
    expect(isChatRelayConfigured()).toBe(false);
  });
});
