/**
 * X (Twitter) OAuth 2.0 PKCE helpers.
 * We request users.read (profile/username) and tweet.read so the backend can call X API v2.
 *
 * Callback URL: In X Developer Portal you must add the exact redirect_uri(s) we send.
 * - Production: https://yourdomain.com/profile/x/callback
 *   Important: use the same host for app + callback to preserve local wallet session storage.
 */

const X_OAUTH_AUTHORIZE = 'https://twitter.com/i/oauth2/authorize';
/** Scopes required for X API v2 /2/users/me (users.read) and tweet read (tweet.read). */
const X_OAUTH_SCOPE = 'users.read tweet.read';

/** Path for the OAuth redirect callback. Register full URL in X Developer Portal. */
export const X_OAUTH_CALLBACK_PATH = '/profile/x/callback';

/**
 * Redirect URI for the current origin.
 * Keep the current host (localhost vs 127.0.0.1) to avoid cross-origin wallet/session loss.
 */
export function getXCallbackRedirectUri(): string {
  if (typeof window === 'undefined' || !window.location?.origin) return '';
  const origin = window.location.origin.replace(/\/$/, '');
  return `${origin}${X_OAUTH_CALLBACK_PATH}`;
}

function base64UrlEncode(bytes: Uint8Array): string {
  const bin = Array.from(bytes)
    .map((b) => String.fromCodePoint(b))
    .join('');
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Generate a random code_verifier (43–128 chars). */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i += 1) array[i] = Math.floor(Math.random() * 256);
  }
  return base64UrlEncode(array);
}

/** Compute code_challenge = BASE64URL(SHA256(ASCII(code_verifier))). */
export async function computeCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(hash));
}

const X_OAUTH_STATE_PREFIX = 'superhero_x_';

/** Generate a short random state and return full state string (includes prefix for validation). */
export function generateOAuthState(): string {
  const array = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i += 1) array[i] = Math.floor(Math.random() * 256);
  }
  return X_OAUTH_STATE_PREFIX + base64UrlEncode(array);
}

export function isOurOAuthState(state: string): boolean {
  return typeof state === 'string' && state.startsWith(X_OAUTH_STATE_PREFIX);
}

export const X_OAUTH_STORAGE_KEY = 'superhero_x_oauth_pkce';

export type XOAuthStored = {
  state: string;
  codeVerifier: string;
  address: string;
  redirectUri: string;
};

export function storeXOAuthPKCE(data: XOAuthStored): void {
  try {
    sessionStorage.setItem(X_OAUTH_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function getAndClearXOAuthPKCE(): XOAuthStored | null {
  try {
    const raw = sessionStorage.getItem(X_OAUTH_STORAGE_KEY);
    sessionStorage.removeItem(X_OAUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as XOAuthStored;
  } catch {
    return null;
  }
}

/** Build the X OAuth 2.0 authorize URL (PKCE). Redirect user here to start "Connect X". */
export async function buildXAuthorizeUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeVerifier: string;
}): Promise<string> {
  const codeChallenge = await computeCodeChallenge(params.codeVerifier);
  const q = new URLSearchParams({
    response_type: 'code',
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    scope: X_OAUTH_SCOPE,
    state: params.state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${X_OAUTH_AUTHORIZE}?${q.toString()}`;
}
