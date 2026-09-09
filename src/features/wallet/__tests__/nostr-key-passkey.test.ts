// @vitest-environment node
//
// WebCrypto (vault seal/unseal, factor KEK, PRF→seed derivation) — exercised in
// the node environment, which has a complete SubtleCrypto.
import {
  describe, expect, it, vi,
} from 'vitest';

/**
 * A passkey-created wallet must be a FULL wallet — chat included.
 *
 * `createWalletFromPasskey` derives the BIP39 seed from the passkey's PRF output
 * instead of having the user transcribe it (`passkey-seed.ts`); the nostr
 * identity comes off that same seed down a second, independent path
 * (`m/44'/1237'/0'/0/<index>`, secp256k1 — NOT the AE SLIP-0010 path). Nothing in
 * `nostr-key.ts` knows how the seed reached the vault, and nothing asserted that
 * the passkey path leaves it derivable.
 *
 * Pinned here: the record `createWalletFromPasskey` persists opens through the
 * REAL passkey unlock and yields the identity its own seed implies. Paired with
 * `passkey-recovery.test.ts` (the same passkey rebuilds the same mnemonic on an
 * empty device), that is the full chain — a passkey wallet's chat identity
 * survives losing the device. The regression guarded against is a passkey wallet
 * that can hold funds but silently cannot enable chat.
 */

// The fake authenticator's PRF is a real function of (credential, salt), as a
// real one is — so the seed salt and the factor's random KEK salt yield DIFFERENT
// outputs. A flat stub would hide a swap between the two, and would let a change
// to `SEED_PRF_SALT_LABEL` (which strands every passkey wallet) pass unnoticed.
const authenticator = vi.hoisted(() => ({
  credentials: new Map<string, Uint8Array>(),
  nextId: 0,
}));

vi.mock('../webauthn', async () => {
  const { hmac } = await import('@noble/hashes/hmac.js');
  const { sha256 } = await import('@noble/hashes/sha2.js');
  const prf = (id: string, salt: Uint8Array) => (
    hmac(sha256, authenticator.credentials.get(id)!, salt)
  );
  return {
    enrollPrfCredential: async ({ prfSalt }: { prfSalt: Uint8Array }) => {
      authenticator.nextId += 1;
      const id = `cred-${authenticator.nextId}`;
      authenticator.credentials.set(id, crypto.getRandomValues(new Uint8Array(32)));
      return {
        credentialId: new TextEncoder().encode(id),
        prfOutput: prf(id, prfSalt),
        rpId: 'superhero.com',
      };
    },
    evaluatePrf: async (opts: { credentialId: Uint8Array; prfSalt: Uint8Array }) => (
      prf(new TextDecoder().decode(opts.credentialId), opts.prfSalt)
    ),
  };
});

const { mnemonicToSeedSync } = await import('@scure/bip39');
const { deriveKeysFromSeed } = await import('@/features/chat/nostr/crypto');
const { deriveNostrIdentity } = await import('../nostr-key');
const { createWalletFromPasskey, passkeyUnlockProvider } = await import('../wallet-lifecycle');
const { createInMemoryVaultStore } = await import('../vault-store');

const createPasskeyWallet = () => createWalletFromPasskey(
  createInMemoryVaultStore(),
  { userName: 'test', now: 0 },
);

describe('nostr identity for a passkey-created wallet', () => {
  it('derives the identity the passkey’s own seed implies', async () => {
    const created = await createPasskeyWallet();

    const viaVault = await deriveNostrIdentity(created.record, passkeyUnlockProvider(), 0);
    const direct = deriveKeysFromSeed(mnemonicToSeedSync(created.mnemonic), 0);

    expect(viaVault.npub).toBe(direct.npub);
  });

  it('gives different passkeys different chat identities', async () => {
    const a = await createPasskeyWallet();
    const b = await createPasskeyWallet();

    const keysA = await deriveNostrIdentity(a.record, passkeyUnlockProvider(), 0);
    const keysB = await deriveNostrIdentity(b.record, passkeyUnlockProvider(), 0);

    expect(keysA.npub).not.toBe(keysB.npub);
  });
});
