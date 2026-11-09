import {
  afterEach, describe, expect, it, vi,
} from 'vitest';

// The flags are read once at import, so each case needs a fresh module.
async function loadFlags() {
  vi.resetModules();
  const { IS_IN_APP_BROWSER, IS_IN_WALLET } = await import('../constants');
  return { IS_IN_APP_BROWSER, IS_IN_WALLET };
}

afterEach(() => {
  delete (window as any).cordova_iab;
  delete (window as any).webkit;
});

describe('in-app browser detection', () => {
  it('stays off in an ordinary browser, where a failed reconnect must keep the session', async () => {
    expect(await loadFlags()).toEqual({ IS_IN_APP_BROWSER: false, IS_IN_WALLET: false });
  });

  it('ignores a WebKit host without the Cordova bridge', async () => {
    (window as any).webkit = { messageHandlers: {} };
    expect((await loadFlags()).IS_IN_APP_BROWSER).toBe(false);
  });

  it('detects the Android bridge', async () => {
    (window as any).cordova_iab = { postMessage: () => {} };
    expect(await loadFlags()).toEqual({ IS_IN_APP_BROWSER: true, IS_IN_WALLET: true });
  });

  it('detects the iOS bridge', async () => {
    (window as any).webkit = { messageHandlers: { cordova_iab: { postMessage: () => {} } } };
    expect(await loadFlags()).toEqual({ IS_IN_APP_BROWSER: true, IS_IN_WALLET: true });
  });
});
