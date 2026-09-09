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

  it('seals a SELF-DESCRIBING box — records the alg and the bound aad', async () => {
    const dek = await generateDek();
    const box = await seal(MNEMONIC, dek);
    expect(box.alg).toBe('AES-GCM');
    expect(box.aad).toBe('superhero-vault-v1');
  });

  it('open reads alg+aad FROM the box, not the current constant', async () => {
    // a box sealed under a future/non-default aad opens without the caller
    // passing it — proof that unseal reads the box, not DEFAULT_AAD.
    const dek = await generateDek();
    const box = await seal(MNEMONIC, dek, 'superhero-vault-v2');
    expect(box.aad).toBe('superhero-vault-v2');
    expect(await unseal(box, dek)).toBe(MNEMONIC);
  });

  it('opens a LEGACY { iv, ct } box (no alg/aad) via the constant fallback', async () => {
    // the shape this envelope replaces — the migration must not strand it.
    const dek = await generateDek();
    const box = await seal(MNEMONIC, dek);
    const legacy: SealedBox = { iv: box.iv, ct: box.ct };
    expect(await unseal(legacy, dek)).toBe(MNEMONIC);
  });
});
