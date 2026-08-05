// @vitest-environment node
//
// WebCrypto (vault seal/unseal, factor KEK) — exercised in the node environment,
// which has a complete SubtleCrypto. Proves the custody PATH (vault → unlock →
// nostr-only handle) yields the same identity the golden-vector test pins.
import {
  describe, expect, it, vi,
} from 'vitest';
import { deriveNostrIdentity } from '../nostr-key';
import { createVault, type FactorEnrollment } from '../vault-record';
import { kekFromHighEntropy, type HkdfKdf } from '../factors';
import { toB64 } from '../vault';
import type { UnlockProvider } from '../inline-signer';

const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon '
  + 'abandon abandon abandon about';

// Same mnemonic + account index 0 as the chat golden-vector test.
const GOLDEN_NPUB_0 = 'npub1az708q3kd9zy6z6f44zav5ygvdwelkzspf6mtusttx47lft2z38sghk0w7';

async function buildVaultWithHighEntropyFactor() {
  const secret = crypto.getRandomValues(new Uint8Array(16)); // 128-bit recovery-code-like
  const kdf: HkdfKdf = { alg: 'hkdf-sha256', salt: toB64(crypto.getRandomValues(new Uint8Array(32))), info: 'test' };
  const kek = await kekFromHighEntropy(secret, kdf);
  const enrollment: FactorEnrollment = {
    id: 'factor-1', type: 'recovery-code', label: 'Test', createdAt: 0, kdf, kek,
  };
  const record = await createVault(TEST_MNEMONIC, enrollment, 0);
  const unlock: UnlockProvider = async () => ({
    factorId: 'factor-1',
    kek: await kekFromHighEntropy(secret, kdf),
  });
  return { record, unlock };
}

describe('deriveNostrIdentity — vault → nostr-only handle', () => {
  it('derives the golden npub through the vault + unlock path', async () => {
    const { record, unlock } = await buildVaultWithHighEntropyFactor();
    const keys = await deriveNostrIdentity(record, unlock, 0);
    expect(keys.npub).toBe(GOLDEN_NPUB_0);
  });

  it('returns ONLY nostr key material — no mnemonic, seed, or DEK leaks out', async () => {
    const { record, unlock } = await buildVaultWithHighEntropyFactor();
    const keys = await deriveNostrIdentity(record, unlock, 0);
    expect(Object.keys(keys).sort()).toEqual(['npub', 'nsec', 'privateKey', 'publicKey']);
    // the sealed mnemonic must never appear in the returned handle
    expect(JSON.stringify(keys)).not.toContain('abandon');
  });

  it('runs user verification exactly once per derivation', async () => {
    const { record, unlock } = await buildVaultWithHighEntropyFactor();
    const spy = vi.fn(unlock);
    await deriveNostrIdentity(record, spy, 0);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('propagates a rejected unlock (user cancelled verification)', async () => {
    const { record } = await buildVaultWithHighEntropyFactor();
    const rejecting: UnlockProvider = async () => { throw new Error('cancelled'); };
    await expect(deriveNostrIdentity(record, rejecting, 0)).rejects.toThrow('cancelled');
  });
});
