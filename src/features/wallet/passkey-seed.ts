/**
 * Passkey-derived seed — the web (non-PWA) wallet creation path.
 *
 * The browser-tab flow has no seed-phrase screen: the user taps "Continue with
 * passkey" and a wallet exists. That is only safe because the mnemonic is not
 * *discarded*, it is DERIVED — deterministically, from the passkey's own PRF
 * output — so it can be re-obtained later (export in settings) or re-derived
 * from scratch on a new device with nothing but the passkey.
 *
 * Two properties make that work, and both are load-bearing:
 *
 *  1. **A fixed, public PRF salt.** WebAuthn's PRF is a pseudorandom function of
 *     (credential, salt). A *random* per-enrollment salt — what
 *     `addPasskeyFactor` correctly uses for its KEK — would have to be stored
 *     alongside the vault, and IndexedDB is evictable (the threat model R-04): lose the
 *     record, lose the salt, lose the ability to re-derive the seed even though
 *     the passkey still exists. A constant salt is not a weakness (a PRF salt is
 *     a domain separator, not a secret) and it is what makes the passkey ALONE
 *     sufficient to recover the wallet.
 *  2. **HKDF domain separation.** One PRF output feeds two different purposes —
 *     the BIP39 entropy here, and the DEK-wrapping KEK in `factors.ts`. They are
 *     separated by distinct HKDF `info` strings so neither can be computed from
 *     the other; the seed material never doubles as the wrapping key.
 *
 * The derived mnemonic is a normal BIP39 phrase run through the SAME
 * `AccountMnemonicFactory` path as every other Superhero wallet
 * (`derivation.ts`), so a passkey-created account is byte-identical to importing
 * that phrase into the extension or the native app. There is nothing
 * proprietary to be stranded in.
 *
 * Nothing here is persisted server-side — no key, no seed, no PRF output ever
 * leaves the device (the custody decision).
 */
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { entropyToMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

/**
 * The PRF salt used for SEED derivation. Fixed and public by design — see (1)
 * above. Versioned so a future change can introduce v2 without silently
 * re-deriving a different wallet for an existing passkey.
 *
 * MUST NOT be changed: every wallet created on the web path derives its seed
 * from this exact value. Altering it strands every such wallet.
 */
export const SEED_PRF_SALT_LABEL = 'superhero.com/wallet/seed/v1';

/** The fixed salt as bytes, for `evaluatePrf`/`enrollPrfCredential`. */
export function seedPrfSalt(): Uint8Array {
  return new TextEncoder().encode(SEED_PRF_SALT_LABEL);
}

/**
 * HKDF `info` for the seed. Distinct from `factors.ts`'s `'webauthn-prf'` (the
 * KEK) so the two derivations are cryptographically independent — see (2).
 */
const SEED_INFO = new TextEncoder().encode('superhero-wallet-seed-v1');

/**
 * HKDF salt for the seed derivation. A constant (not random) for the same
 * recoverability reason as the PRF salt; HKDF-Extract tolerates a fixed,
 * non-secret salt, and the entropy here comes entirely from the 32-byte PRF
 * output.
 */
const SEED_HKDF_SALT = new TextEncoder().encode('superhero-wallet-seed-hkdf-v1');

/** 16 bytes → a 12-word BIP39 phrase, matching `generateMnemonic()`'s default. */
const ENTROPY_BYTES = 16;

/**
 * Derive the wallet's BIP39 mnemonic from a WebAuthn PRF output.
 *
 * Deterministic: the same PRF output always yields the same phrase, which is the
 * whole point — it is what lets the passkey stand in for a written backup.
 *
 * @param prfOutput the ≥32-byte PRF result for `seedPrfSalt()`
 * @throws if the PRF output is too short to be trusted as 256-bit-class input
 */
export function mnemonicFromPrf(prfOutput: Uint8Array): string {
  if (prfOutput.length < 32) {
    throw new Error('passkey-seed: PRF output too short to derive a seed');
  }
  const entropy = hkdf(sha256, prfOutput, SEED_HKDF_SALT, SEED_INFO, ENTROPY_BYTES);
  return entropyToMnemonic(entropy, wordlist);
}
