// @vitest-environment node
//
// WebCrypto (crypto.subtle) — exercised in the node environment, which has a
// complete SubtleCrypto. (jsdom's is partial/absent depending on version; this
// module is environment-independent WebCrypto, identical in the browser.)
import {
  describe, expect, it,
} from 'vitest';
import {
  generateDek, seal, unseal, type SealedBox,
} from '../vault';

const MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon '
  + 'abandon abandon abandon about';

describe('vault inner envelope (DEK seals the mnemonic)', () => {
  it('round-trips: unseal(seal(x)) === x', async () => {
    const dek = await generateDek();
    const box = await seal(MNEMONIC, dek);
    expect(await unseal(box, dek)).toBe(MNEMONIC);
  });

  it('never stores plaintext — the SealedBox contains no substring of the mnemonic', async () => {
    const dek = await generateDek();
    const box = await seal(MNEMONIC, dek);
    const words = MNEMONIC.split(' ');
    // no whole word from the mnemonic leaks into iv/ct
    words.forEach((w) => {
      expect(box.iv.includes(w)).toBe(false);
      expect(box.ct.includes(w)).toBe(false);
    });
  });

  it('uses a fresh IV every seal — same plaintext+key yields different iv AND ct', async () => {
    const dek = await generateDek();
    const a = await seal(MNEMONIC, dek);
    const b = await seal(MNEMONIC, dek);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });

  it('fails closed under the WRONG key (GCM auth failure, not silent garbage)', async () => {
    const box = await seal(MNEMONIC, await generateDek());
    await expect(unseal(box, await generateDek())).rejects.toThrow();
  });

  it('fails closed under a TAMPERED ciphertext', async () => {
    const dek = await generateDek();
    const box = await seal(MNEMONIC, dek);
    const raw = atob(box.ct);
    // flip the first byte to a different value (no bitwise ops) — tampers the ciphertext
    const flipped = String.fromCharCode((raw.charCodeAt(0) + 1) % 256) + raw.slice(1);
    const tampered: SealedBox = { iv: box.iv, ct: btoa(flipped) };
    await expect(unseal(tampered, dek)).rejects.toThrow();
  });

  it('fails closed under a MISMATCHED AAD (context-binding holds)', async () => {
    const dek = await generateDek();
    const box = await seal(MNEMONIC, dek, 'superhero-vault-v1');
    await expect(unseal(box, dek, 'some-other-context')).rejects.toThrow();
  });
});
