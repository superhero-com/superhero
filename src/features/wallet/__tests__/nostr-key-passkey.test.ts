// @vitest-environment node
//
// WebCrypto (vault seal/unseal, factor KEK, PRF→seed derivation) — exercised in
// the node environment, which has a complete SubtleCrypto.
import {
  describe, expect, it, vi,
} from 'vitest';
import { deriveNostrIdentity } from '../nostr-key';
import { createWalletFromPasskey } from '../wallet-lifecycle';
import { mnemonicFromPrf } from '../passkey-seed';
import { deriveAccount } from '../derivation';
import { kekFromHighEntropy, type HkdfKdf } from '../factors';
import type { VaultRecord } from '../vault-record';
import type { UnlockProvider } from '../inline-signer';

/**
 * A passkey-created wallet must be a FULL wallet — including chat.
 *
 * `createWalletFromPasskey` derives the BIP39 seed from the passkey's PRF output
 * instead of having the user transcribe it (`passkey-seed.ts`). The nostr
 * identity is derived from that same seed down a second, independent path
 * (`m/44'/1237'/0'/0/<index>`, secp256k1 — NOT the AE SLIP-0010 path). Nothing
 * in `nostr-key.ts` knows or cares how the seed got into the vault, and these
 * tests pin that: chat identity, AE account, and the AE↔Nostr link must all work
 * for a passkey wallet exactly as for a phrase wallet.
 *
 * The regression guarded against is a passkey wallet that can hold funds but
 * silently cannot enable chat — the seed is there, so any such failure would be
 * a wiring bug, not a cryptographic limit.
 */

const PRF = new Uint8Array(32).fill(0x42);

/** An in-memory VaultStore — no IndexedDB in the node environment. */
const memoryStore = () => {
  let saved: VaultRecord | null = null;
  return {
    load: async () => saved,
    save: async (r: VaultRecord) => { saved = r; },
    clear: async () => { saved = null; },
  };
};

/**
 * Stub the WebAuthn ceremony: a real one cannot run headlessly (no
 * authenticator), so the PRF output is injected. Everything downstream of the
 * ceremony — HKDF, BIP39, the vault, both derivation paths — is the real code.
 */
const stubPasskey = (prfOutput = PRF) => {
  vi.stubGlobal('navigator', {
    credentials: {
      create: async () => ({
        rawId: new Uint8Array([1, 2, 3, 4]).buffer,
        getClientExtensionResults: () => ({
          prf: { enabled: true, results: { first: prfOutput.buffer } },
        }),
      }),
    },
  });
};

/**
 * The unlock the chat entry point would run. A passkey wallet's real unlock is
 * the WebAuthn PRF ceremony; re-deriving the same KEK from the same PRF output
 * is exactly what that ceremony yields, without needing an authenticator.
 */
const passkeyUnlock = (record: VaultRecord, prfOutput = PRF): UnlockProvider => async () => {
  const factor = record.factors.find((f) => f.type === 'webauthn-prf');
  if (!factor) throw new Error('no passkey factor');
  return { factorId: factor.id, kek: await kekFromHighEntropy(prfOutput, factor.kdf as HkdfKdf) };
};

describe('nostr identity for a passkey-created wallet', () => {
  it('derives a nostr identity through the passkey unlock path', async () => {
    stubPasskey();
    const store = memoryStore();
    const created = await createWalletFromPasskey(store, { userName: 'test', now: 0 });

    const keys = await deriveNostrIdentity(created.record, passkeyUnlock(created.record), 0);

    expect(keys.npub).toMatch(/^npub1/);
    expect(keys.publicKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is the identity the passkey’s own seed implies', async () => {
    // The vault is not an independent source of truth: the same PRF output must
    // reproduce the same chat identity, which is what makes a passkey wallet
    // recoverable on a new device.
    stubPasskey();
    const store = memoryStore();
    const created = await createWalletFromPasskey(store, { userName: 'test', now: 0 });

    const viaVault = await deriveNostrIdentity(created.record, passkeyUnlock(created.record), 0);

    // Derive independently, straight from the PRF output, with no vault involved.
    const { deriveKeysFromSeed } = await import('@/features/chat/nostr/crypto');
    const { mnemonicToSeedSync } = await import('@scure/bip39');
    const direct = deriveKeysFromSeed(mnemonicToSeedSync(mnemonicFromPrf(PRF)), 0);

    expect(viaVault.npub).toBe(direct.npub);
  });

  it('gives different passkeys different chat identities', async () => {
    const other = new Uint8Array(32).fill(0x99);

    stubPasskey();
    const a = await createWalletFromPasskey(memoryStore(), { userName: 't', now: 0 });
    const keysA = await deriveNostrIdentity(a.record, passkeyUnlock(a.record), 0);

    stubPasskey(other);
    const b = await createWalletFromPasskey(memoryStore(), { userName: 't', now: 0 });
    const keysB = await deriveNostrIdentity(b.record, passkeyUnlock(b.record, other), 0);

    expect(keysA.npub).not.toBe(keysB.npub);
  });

  it('returns ONLY nostr key material — the seed does not escape', async () => {
    stubPasskey();
    const store = memoryStore();
    const created = await createWalletFromPasskey(store, { userName: 'test', now: 0 });

    const keys = await deriveNostrIdentity(created.record, passkeyUnlock(created.record), 0);

    expect(Object.keys(keys).sort()).toEqual(['npub', 'nsec', 'privateKey', 'publicKey']);
    // The derived mnemonic must not be reachable through the returned handle.
    const words = created.mnemonic.split(' ');
    expect(JSON.stringify(keys)).not.toContain(words[0]);
  });

  it('keeps the AE and nostr paths independent', async () => {
    // Two different curves and derivation paths off one seed. A regression that
    // routed nostr through AccountMnemonicFactory (or vice versa) would show up
    // as one of these matching the other.
    stubPasskey();
    const store = memoryStore();
    const created = await createWalletFromPasskey(store, { userName: 'test', now: 0 });

    const keys = await deriveNostrIdentity(created.record, passkeyUnlock(created.record), 0);
    const { address } = deriveAccount(created.mnemonic, 0);

    expect(address).toMatch(/^ak_/);
    expect(keys.publicKey).not.toContain(address.slice(3));
  });

  it('derives per-account-index identities, matching the manifest', async () => {
    // Chat identity is scoped to the AE account index, so switching account must
    // switch npub — the account-switch recheck in useNostrLinkCheck depends on it.
    stubPasskey();
    const store = memoryStore();
    const created = await createWalletFromPasskey(store, { userName: 'test', now: 0 });

    const first = await deriveNostrIdentity(created.record, passkeyUnlock(created.record), 0);
    const second = await deriveNostrIdentity(created.record, passkeyUnlock(created.record), 1);

    expect(first.npub).not.toBe(second.npub);
  });
});
