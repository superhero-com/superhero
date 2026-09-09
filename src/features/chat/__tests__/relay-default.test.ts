import {
  describe, expect, it, vi,
} from 'vitest';

/**
 * Chat relay resolution — default on, overridable, never accidentally off.
 *
 * The relay is a built-in default (`COMMON_CONFIG.NOSTR_RELAY_URLS`) rather than
 * deploy-only config, so chat works on every surface without ops wiring an env
 * var into each one:
 *
 *   1. nothing set          → the default relay, chat live
 *   2. runtime value set    → that relay wins (repoint without a rebuild)
 *   3. runtime value ''     → still the default relay, chat live
 *
 * Case 3 used to be "chat dark-ships", via an `EMPTY_MEANS_OFF` carve-out so an
 * operator could disable chat by blanking the var. Nobody ever did that
 * deliberately; what actually happened is that `ssh_deploy.yaml` passed an unset
 * workflow input through as `-e NOSTR_RELAY_URLS=""`, so every deployed
 * container blanked its own built-in relay and served chat dark. The carve-out
 * is gone and '' is junk like any other placeholder — this test is the guard
 * against reintroducing it.
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

  it('keeps the default when the runtime value is blank', async () => {
    // The bug this replaced: an unset deploy input reached the container as
    // `NOSTR_RELAY_URLS=`, which the client read as a deliberate "chat off" and
    // which therefore blanked the relay on every environment.
    const config = await loadConfig({ NOSTR_RELAY_URLS: '' });
    expect(config.NOSTR_RELAY_URLS).toBe(DEFAULT_RELAY);
  });

  it('ignores an unsubstituted $PLACEHOLDER and keeps the default', async () => {
    // A broken deploy (envsubst never ran) is not a request to disable chat.
    const config = await loadConfig({ NOSTR_RELAY_URLS: '$NOSTR_RELAY_URLS' });
    expect(config.NOSTR_RELAY_URLS).toBe(DEFAULT_RELAY);
  });

  it('discards empty values for every other key too', async () => {
    // No key opts out of this: a blank runtime value never clobbers a good default.
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

  it('passes the gate even when the deploy blanks the relay', async () => {
    // The production symptom this fixes: a blank runtime value took chat down to
    // ChatUnavailableNotice on /chat, /chat/dm/:address and /chat/:saleAddress.
    vi.resetModules();
    vi.stubGlobal('window', { __SUPERCONFIG__: { NOSTR_RELAY_URLS: '' } });
    const { isChatRelayConfigured, configuredRelayUrls } = await import('@/features/chat/core/relay-config');
    expect(isChatRelayConfigured()).toBe(true);
    expect(configuredRelayUrls()).toEqual([DEFAULT_RELAY]);
  });
});
