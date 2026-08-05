/**
 * P2 slice 3 — the WebAuthn PRF factor ceremony (build-plan §4.3, §6 corrections).
 *
 * A platform passkey's PRF extension yields a stable, high-entropy 32-byte secret
 * for (credential, salt); `kekFromHighEntropy` (factors.ts) turns it into a KEK
 * that wraps the DEK. This module ONLY runs the WebAuthn ceremony and returns the
 * raw PRF output — the crypto lives in factors.ts, already unit-tested.
 *
 * RP ID is the custody boundary: it MUST be the wallet origin (`superhero.com`).
 * Under the same-origin decision (adr-0003) that is the app origin itself.
 *
 * The live `navigator.credentials.create/get` ceremonies cannot run headlessly
 * (no authenticator) and are DEVICE-TEST-GATED (build-plan §7.6 / P5): verify PRF
 * availability + stability across a user's synced devices, and after a passcode
 * change, on real hardware. The funds-critical *logic* — the "prf.enabled AND
 * non-empty results is the ONLY proof" gate (§6 correction #10) and capability
 * detection — is unit-tested here via injected results.
 */

export const PRF_UNSUPPORTED = 'webauthn-prf: this device/credential did not return a PRF result';

/** True iff a user-verifying platform authenticator exists. Feature-detect only, never UA-sniff. */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof PublicKeyCredential === 'undefined') return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/** Default RP ID when no build-time value is configured — the production host. */
export const DEFAULT_RP_ID = 'superhero.com';

/**
 * Pure resolver for the pinned RP ID: a non-empty configured value wins,
 * otherwise the production default. Exported so the pinning contract is
 * unit-testable without a real build, and NEVER reads `window.location`.
 */
export function pinnedRpId(env?: { VITE_WEBAUTHN_RP_ID?: string }): string {
  const configured = env?.VITE_WEBAUTHN_RP_ID;
  if (typeof configured === 'string' && configured.trim() !== '') return configured.trim();
  return DEFAULT_RP_ID;
}

/**
 * The RP ID for wallet passkeys — the custody boundary — decided ONCE at build
 * time from `VITE_WEBAUTHN_RP_ID` (statically inlined by Vite) and baked into
 * the artifact. It is NEVER derived from `window.location` at runtime, so a
 * bundle served from an unexpected host cannot silently mint host-scoped
 * credentials. Production ships the default (`superhero.com`); preview/staging/
 * dev builds set their own value — which must be a registrable suffix of that
 * build's origin — so the ceremony stays runnable there.
 */
export const RP_ID: string = pinnedRpId(import.meta.env);

/**
 * Validate + extract the 32-byte PRF output from a credential's extension
 * results. This is the ONLY accepted proof that PRF works: `enabled === true`
 * (where present) AND a non-empty `results.first`. A `{ enabled: true }` with no
 * results (some CTAP2.1 keys) is treated as UNSUPPORTED — never as success.
 *
 * @param results the object returned by `credential.getClientExtensionResults()`
 */
export function extractPrfOutput(results: unknown): Uint8Array {
  const prf = (results as { prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } } })?.prf;
  const first = prf?.results?.first;
  if (!first || (first as ArrayBuffer).byteLength === 0) {
    throw new Error(PRF_UNSUPPORTED);
  }
  const bytes = new Uint8Array(first as ArrayBuffer);
  if (bytes.length < 32) throw new Error(PRF_UNSUPPORTED);
  return bytes;
}

/** Whether PRF is at least reported supported (enabled), independent of having a result yet. */
export function isPrfEnabled(results: unknown): boolean {
  return (results as { prf?: { enabled?: boolean } })?.prf?.enabled === true;
}

function randomChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

const bs = (u: Uint8Array): BufferSource => u as unknown as BufferSource;

/** DEVICE-GATED. Re-evaluate the PRF for an existing credential (the unlock ceremony). */
export async function evaluatePrf(opts: {
  credentialId: Uint8Array;
  prfSalt: Uint8Array;
}): Promise<Uint8Array> {
  const assertion = await navigator.credentials.get({
    publicKey: {
      rpId: RP_ID,
      challenge: bs(randomChallenge()),
      allowCredentials: [{ type: 'public-key', id: bs(opts.credentialId) }],
      userVerification: 'required',
      extensions: { prf: { eval: { first: bs(opts.prfSalt) } } } as AuthenticationExtensionsClientInputs,
    },
  }) as PublicKeyCredential;
  return extractPrfOutput(assertion.getClientExtensionResults());
}

/**
 * DEVICE-GATED. Enroll a new platform passkey with the PRF extension and return
 * its credential id + the PRF output for `prfSalt`. Tries eval-at-create first
 * (works on Apple/GPM/Windows Hello, Chrome ≥147); if the platform reported PRF
 * enabled but returned no result at create, does a follow-up `get()` to obtain it.
 */
export async function enrollPrfCredential(opts: {
  userId: Uint8Array;
  userName: string;
  prfSalt: Uint8Array;
}): Promise<{ credentialId: Uint8Array; prfOutput: Uint8Array; rpId: string }> {
  const rpId = RP_ID;
  const cred = await navigator.credentials.create({
    publicKey: {
      rp: { id: rpId, name: 'Superhero' },
      user: { id: bs(opts.userId), name: opts.userName, displayName: opts.userName },
      challenge: bs(randomChallenge()),
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { userVerification: 'required', residentKey: 'required' },
      extensions: { prf: { eval: { first: bs(opts.prfSalt) } } } as AuthenticationExtensionsClientInputs,
    },
  }) as PublicKeyCredential;

  const credentialId = new Uint8Array(cred.rawId);
  const results = cred.getClientExtensionResults();
  try {
    return { credentialId, prfOutput: extractPrfOutput(results), rpId };
  } catch {
    // eval-at-create not returned but PRF is enabled → obtain via a get() (second prompt).
    if (!isPrfEnabled(results)) throw new Error(PRF_UNSUPPORTED);
    const prfOutput = await evaluatePrf({ credentialId, prfSalt: opts.prfSalt });
    return { credentialId, prfOutput, rpId };
  }
}
