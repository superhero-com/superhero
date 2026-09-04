// @vitest-environment node
//
// The recovery property end-to-end: the same passkey must rebuild the same
// wallet from an empty device, and a different PRF output must yield a visibly
// different one — nothing else in the suite would catch a
// silently-different-wallet-on-second-device regression. Real crypto throughout;
// only the WebAuthn ceremonies are faked, with a deterministic per-credential
// PRF (HMAC-SHA256(credential secret, salt)) so re-evaluation behaves like a
// real authenticator.
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

const authenticator = vi.hoisted(() => ({
  credentials: new Map<string, Uint8Array>(),
  nextId: 0,
  // Which credential a discoverable get() "picks" (the OS picker, in miniature).
  pick: '',
  truncate: false,
}));

vi.mock('../webauthn', async () => {
  const { hmac } = await import('@noble/hashes/hmac.js');
  const { sha256 } = await import('@noble/hashes/sha2.js');
  const prf = (id: string, salt: Uint8Array) => (
    hmac(sha256, authenticator.credentials.get(id)!, salt)
  );
  const toId = (bytes: Uint8Array) => new TextDecoder().decode(bytes);
  return {
    enrollPrfCredential: async ({ prfSalt }: { prfSalt: Uint8Array }) => {
      authenticator.nextId += 1;
      const id = `cred-${authenticator.nextId}`;
      authenticator.credentials.set(id, crypto.getRandomValues(new Uint8Array(32)));
      authenticator.pick = id;
      return { credentialId: new TextEncoder().encode(id), prfOutput: prf(id, prfSalt), rpId: 'superhero.com' };
    },
    discoverPrf: async ({ prfSalt }: { prfSalt: Uint8Array }) => ({
      credentialId: new TextEncoder().encode(authenticator.pick),
      prfOutput: authenticator.truncate
        ? prf(authenticator.pick, prfSalt).slice(0, 16)
        : prf(authenticator.pick, prfSalt),
      rpId: 'superhero.com',
    }),
    evaluatePrf: async (
      { credentialId, prfSalt }: { credentialId: Uint8Array; prfSalt: Uint8Array },
    ) => prf(toId(credentialId), prfSalt),
  };
});

const {
  commitRecoveredWallet, createWalletFromPasskey, deriveRecoveredWallet, passkeyUnlockProvider,
} = await import('../wallet-lifecycle');
const { createInMemoryVaultStore } = await import('../vault-store');
const { unlockVault } = await import('../vault-record');
const { deriveAccount } = await import('../derivation');

describe('passkey recovery', () => {
  beforeEach(() => {
    authenticator.credentials.clear();
    authenticator.nextId = 0;
    authenticator.pick = '';
    authenticator.truncate = false;
  });

  it('the same passkey rebuilds the identical wallet on an empty device', async () => {
    const deviceA = createInMemoryVaultStore();
    const created = await createWalletFromPasskey(deviceA, { userName: 'w', now: 1 });
    const original = deriveAccount(created.mnemonic, 0).address;

    // Device B: nothing but the (synced) passkey.
    const deviceB = createInMemoryVaultStore();
    const material = await deriveRecoveredWallet(deviceB);
    expect(material.address).toBe(original);

    // Derive persisted nothing — backing out must cost nothing.
    expect(await deviceB.load()).toBeNull();

    const { record } = await commitRecoveredWallet(deviceB, material, 2);
    expect(await deviceB.load()).toEqual(record);

    // The rebuilt record unlocks through the normal pinned ceremony.
    const { factorId, kek } = await passkeyUnlockProvider()(record);
    const { mnemonic } = await unlockVault(record, factorId, kek);
    expect(mnemonic).toBe(created.mnemonic);
  });

  it('a different credential derives a different wallet (the wrong-pick / PRF-rekey case)', async () => {
    const deviceA = createInMemoryVaultStore();
    const created = await createWalletFromPasskey(deviceA, { userName: 'w', now: 1 });
    const original = deriveAccount(created.mnemonic, 0).address;

    // The picker offers a different credential (e.g. a seed-phrase wallet's
    // device factor, or a rekeyed passkey).
    authenticator.credentials.set('other', crypto.getRandomValues(new Uint8Array(32)));
    authenticator.pick = 'other';

    const material = await deriveRecoveredWallet(createInMemoryVaultStore());
    expect(material.address).not.toBe(original);
  });

  it('refuses to derive or commit over an existing vault', async () => {
    const store = createInMemoryVaultStore();
    const created = await createWalletFromPasskey(store, { userName: 'w', now: 1 });

    await expect(deriveRecoveredWallet(store)).rejects.toThrow(/already exists/);

    const empty = createInMemoryVaultStore();
    const material = await deriveRecoveredWallet(empty);
    // A vault appearing between derive and commit (another tab) must not be clobbered.
    await empty.save((await store.load())!);
    await expect(commitRecoveredWallet(empty, material, 3)).rejects.toThrow(/already exists/);
    expect(await empty.load()).toEqual(created.record);
  });

  it('refuses to unlock when the credential is rekeyed under the same id', async () => {
    // The Apple FB22434584 case in miniature: the same credential id now yields a
    // different PRF output, and the provider is where that has to surface.
    const store = createInMemoryVaultStore();
    const { record } = await createWalletFromPasskey(store, { userName: 'w', now: 1 });
    authenticator.credentials.set(authenticator.pick, crypto.getRandomValues(new Uint8Array(32)));

    await expect(passkeyUnlockProvider()(record)).rejects.toThrow(/could not unlock/i);
  });

  it('a short PRF output fails the derive instead of yielding a weak wallet', async () => {
    authenticator.credentials.set('weak', crypto.getRandomValues(new Uint8Array(32)));
    authenticator.pick = 'weak';
    authenticator.truncate = true;

    const store = createInMemoryVaultStore();
    await expect(deriveRecoveredWallet(store)).rejects.toThrow(/too short/i);
    expect(await store.load()).toBeNull();
  });
});
