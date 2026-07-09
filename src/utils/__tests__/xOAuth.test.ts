import {
  afterEach, describe, expect, it, vi,
} from 'vitest';
import {
  computeCodeChallenge,
  getAndClearXOAuthPKCE,
  storeXOAuthPKCE,
} from '@/utils/xOAuth';

describe('xOAuth', () => {
  afterEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('uses Web Crypto when subtle.digest is available', async () => {
    const digest = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer);
    vi.stubGlobal('crypto', { subtle: { digest } });

    await expect(computeCodeChallenge('verifier')).resolves.toBe('AQID');
    expect(digest).toHaveBeenCalledWith('SHA-256', digest.mock.calls[0][1]);
    expect(ArrayBuffer.isView(digest.mock.calls[0][1])).toBe(true);
  });

  it('falls back when subtle.digest is unavailable', async () => {
    vi.stubGlobal('crypto', {});

    await expect(computeCodeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'))
      .resolves
      .toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('persists OAuth state in both session and local storage', () => {
    storeXOAuthPKCE({
      state: 'superhero_x_state_1',
      codeVerifier: 'verifier',
      address: 'ak_test',
      redirectUri: 'https://example.com/profile/x/callback',
    });

    expect(window.sessionStorage.getItem('superhero_x_oauth_pkce')).toContain('"state":"superhero_x_state_1"');
    expect(window.localStorage.getItem('superhero_x_oauth_pkce')).toContain('"state":"superhero_x_state_1"');
  });

  it('reads fallback OAuth state from local storage and clears both stores', () => {
    const payload = JSON.stringify({
      state: 'superhero_x_state_2',
      codeVerifier: 'verifier-2',
      address: 'ak_test_2',
      redirectUri: 'https://example.com/profile/x/callback',
      createdAt: Date.now(),
    });
    window.localStorage.setItem('superhero_x_oauth_pkce', payload);

    expect(getAndClearXOAuthPKCE()).toEqual({
      state: 'superhero_x_state_2',
      codeVerifier: 'verifier-2',
      address: 'ak_test_2',
      redirectUri: 'https://example.com/profile/x/callback',
    });
    expect(window.sessionStorage.getItem('superhero_x_oauth_pkce')).toBeNull();
    expect(window.localStorage.getItem('superhero_x_oauth_pkce')).toBeNull();
  });

  it('prefers session storage when both stores are present', () => {
    window.sessionStorage.setItem('superhero_x_oauth_pkce', JSON.stringify({
      state: 'superhero_x_state_session',
      codeVerifier: 'session-verifier',
      address: 'ak_session',
      redirectUri: 'https://example.com/profile/x/callback',
      createdAt: Date.now(),
    }));
    window.localStorage.setItem('superhero_x_oauth_pkce', JSON.stringify({
      state: 'superhero_x_state_local',
      codeVerifier: 'local-verifier',
      address: 'ak_local',
      redirectUri: 'https://example.com/profile/x/callback',
      createdAt: Date.now(),
    }));

    expect(getAndClearXOAuthPKCE()).toEqual({
      state: 'superhero_x_state_session',
      codeVerifier: 'session-verifier',
      address: 'ak_session',
      redirectUri: 'https://example.com/profile/x/callback',
    });
  });

  it('falls back to local storage when session payload is malformed', () => {
    window.sessionStorage.setItem('superhero_x_oauth_pkce', '{"broken":');
    window.localStorage.setItem('superhero_x_oauth_pkce', JSON.stringify({
      state: 'superhero_x_state_local_fallback',
      codeVerifier: 'local-fallback',
      address: 'ak_local_fallback',
      redirectUri: 'https://example.com/profile/x/callback',
      createdAt: Date.now(),
    }));

    expect(getAndClearXOAuthPKCE()).toEqual({
      state: 'superhero_x_state_local_fallback',
      codeVerifier: 'local-fallback',
      address: 'ak_local_fallback',
      redirectUri: 'https://example.com/profile/x/callback',
    });
  });

  it('rejects expired payloads and clears both stores', () => {
    const expired = JSON.stringify({
      state: 'superhero_x_state_expired',
      codeVerifier: 'expired-verifier',
      address: 'ak_expired',
      redirectUri: 'https://example.com/profile/x/callback',
      createdAt: Date.now() - (16 * 60 * 1000),
    });
    window.sessionStorage.setItem('superhero_x_oauth_pkce', expired);
    window.localStorage.setItem('superhero_x_oauth_pkce', expired);

    expect(getAndClearXOAuthPKCE()).toBeNull();
    expect(window.sessionStorage.getItem('superhero_x_oauth_pkce')).toBeNull();
    expect(window.localStorage.getItem('superhero_x_oauth_pkce')).toBeNull();
  });
});
