/**
 * X (Twitter) OAuth 2.0 PKCE helpers.
 * We request users.read (profile/username) and tweet.read so the backend can call X API v2.
 *
 * Callback URL: In X Developer Portal you must add the exact redirect_uri(s) we send.
 * - Production: https://yourdomain.com/profile/x/callback
 *   Important: use the same host for app + callback to preserve local wallet session storage.
 */

const X_OAUTH_AUTHORIZE = 'https://x.com/i/oauth2/authorize';
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

function getCryptoApi(): Crypto | undefined {
  if (typeof globalThis === 'undefined') return undefined;
  return globalThis.crypto;
}

const SHA256_INITIAL = [
  0x6a09e667,
  0xbb67ae85,
  0x3c6ef372,
  0xa54ff53a,
  0x510e527f,
  0x9b05688c,
  0x1f83d9ab,
  0x5be0cd19,
];

const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
  0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
  0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
  0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
  0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function base64UrlEncode(bytes: Uint8Array): string {
  const bin = Array.from(bytes)
    .map((b) => String.fromCodePoint(b))
    .join('');
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function rightRotate(value: number, shift: number): number {
  return (value >>> shift) | (value << (32 - shift));
}

function sha256Bytes(message: Uint8Array): Uint8Array {
  const paddedLength = Math.ceil((message.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(message);
  padded[message.length] = 0x80;

  const bitLength = message.length * 8;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
  view.setUint32(paddedLength - 4, bitLength >>> 0, false);

  const state = [...SHA256_INITIAL];
  const words = new Uint32Array(64);

  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      words[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rightRotate(words[i - 15], 7)
        ^ rightRotate(words[i - 15], 18)
        ^ (words[i - 15] >>> 3);
      const s1 = rightRotate(words[i - 2], 17)
        ^ rightRotate(words[i - 2], 19)
        ^ (words[i - 2] >>> 10);
      words[i] = (((words[i - 16] + s0) >>> 0) + ((words[i - 7] + s1) >>> 0)) >>> 0;
    }

    let [a, b, c, d, e, f, g, h] = state;

    for (let i = 0; i < 64; i += 1) {
      const sum1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = ((((h + sum1) >>> 0) + ((choice + SHA256_K[i]) >>> 0)) + words[i]) >>> 0;
      const sum0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sum0 + majority) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    state[0] = (state[0] + a) >>> 0;
    state[1] = (state[1] + b) >>> 0;
    state[2] = (state[2] + c) >>> 0;
    state[3] = (state[3] + d) >>> 0;
    state[4] = (state[4] + e) >>> 0;
    state[5] = (state[5] + f) >>> 0;
    state[6] = (state[6] + g) >>> 0;
    state[7] = (state[7] + h) >>> 0;
  }

  const output = new Uint8Array(32);
  const outputView = new DataView(output.buffer);
  state.forEach((value, index) => {
    outputView.setUint32(index * 4, value, false);
  });
  return output;
}

/** Generate a random code_verifier (43–128 chars). */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  const cryptoApi = getCryptoApi();
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i += 1) array[i] = Math.floor(Math.random() * 256);
  }
  return base64UrlEncode(array);
}

/** Compute code_challenge = BASE64URL(SHA256(ASCII(code_verifier))). */
export async function computeCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const subtle = getCryptoApi()?.subtle;
  if (subtle?.digest) {
    const hash = await subtle.digest('SHA-256', data);
    return base64UrlEncode(new Uint8Array(hash));
  }
  return base64UrlEncode(sha256Bytes(data));
}

const X_OAUTH_STATE_PREFIX = 'superhero_x_';

/** Generate a short random state and return full state string (includes prefix for validation). */
export function generateOAuthState(): string {
  const array = new Uint8Array(16);
  const cryptoApi = getCryptoApi();
  if (cryptoApi?.getRandomValues) {
    cryptoApi.getRandomValues(array);
  } else {
    for (let i = 0; i < array.length; i += 1) array[i] = Math.floor(Math.random() * 256);
  }
  return X_OAUTH_STATE_PREFIX + base64UrlEncode(array);
}

export function isOurOAuthState(state: string): boolean {
  return typeof state === 'string' && state.startsWith(X_OAUTH_STATE_PREFIX);
}

export const X_OAUTH_STORAGE_KEY = 'superhero_x_oauth_pkce';
const X_OAUTH_STORAGE_TTL_MS = 15 * 60 * 1000;

type SimpleStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type XOAuthStored = {
  state: string;
  codeVerifier: string;
  address: string;
  redirectUri: string;
};

type XOAuthStoredEnvelope = XOAuthStored & {
  createdAt: number;
};

function getStorage(kind: 'session' | 'local'): SimpleStorage | null {
  if (typeof window === 'undefined') return null;
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}

function writeOAuthStorage(storage: SimpleStorage | null, payload: XOAuthStoredEnvelope): void {
  if (!storage) return;
  try {
    storage.setItem(X_OAUTH_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

function clearOAuthStorage(storage: SimpleStorage | null): void {
  if (!storage) return;
  try {
    storage.removeItem(X_OAUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function readOAuthStorage(storage: SimpleStorage | null): XOAuthStoredEnvelope | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(X_OAUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<XOAuthStoredEnvelope>;
    if (
      typeof parsed?.state !== 'string'
      || typeof parsed?.codeVerifier !== 'string'
      || typeof parsed?.address !== 'string'
      || typeof parsed?.redirectUri !== 'string'
    ) {
      clearOAuthStorage(storage);
      return null;
    }
    const createdAt = Number(parsed.createdAt);
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > X_OAUTH_STORAGE_TTL_MS) {
      clearOAuthStorage(storage);
      return null;
    }
    return {
      state: parsed.state,
      codeVerifier: parsed.codeVerifier,
      address: parsed.address,
      redirectUri: parsed.redirectUri,
      createdAt,
    };
  } catch {
    clearOAuthStorage(storage);
    return null;
  }
}

export function storeXOAuthPKCE(data: XOAuthStored): void {
  const payload: XOAuthStoredEnvelope = {
    ...data,
    createdAt: Date.now(),
  };
  writeOAuthStorage(getStorage('session'), payload);
  writeOAuthStorage(getStorage('local'), payload);
}

export function getAndClearXOAuthPKCE(): XOAuthStored | null {
  const session = getStorage('session');
  const local = getStorage('local');
  const stored = readOAuthStorage(session) || readOAuthStorage(local);
  clearOAuthStorage(session);
  clearOAuthStorage(local);
  if (!stored) return null;
  return {
    state: stored.state,
    codeVerifier: stored.codeVerifier,
    address: stored.address,
    redirectUri: stored.redirectUri,
  };
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
