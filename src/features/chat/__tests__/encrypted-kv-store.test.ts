// @vitest-environment node
//
// WebCrypto AES-GCM + HKDF — exercised in node, identical in the browser.
import { describe, expect, it } from 'vitest';
import { createInMemoryKeyValueStore } from '../storage/kv-store';
import { createEncryptedKeyValueStore } from '../storage/encrypted-kv-store';
import { deriveMessageStorageKey } from '../storage/message-storage-key';

const PRIV_A = 'aa'.repeat(32);
const PRIV_B = 'bb'.repeat(32);

const MESSAGES = JSON.stringify([
  { id: 'm1', content: 'the eagle lands at dawn', type: 'dm' },
]);

describe('encrypted-kv-store — message history is ciphertext at rest', () => {
  it('round-trips values transparently', async () => {
    const inner = createInMemoryKeyValueStore();
    const key = await deriveMessageStorageKey(PRIV_A);
    const store = createEncryptedKeyValueStore(inner, key);

    await store.setItem('CHAT_MESSAGES_dm_abc', MESSAGES);
    expect(await store.getItem('CHAT_MESSAGES_dm_abc')).toBe(MESSAGES);
  });

  it('stores no plaintext — the underlying value reveals nothing readable', async () => {
    const inner = createInMemoryKeyValueStore();
    const key = await deriveMessageStorageKey(PRIV_A);
    const store = createEncryptedKeyValueStore(inner, key);

    await store.setItem('CHAT_MESSAGES_dm_abc', MESSAGES);
    const atRest = await inner.getItem('CHAT_MESSAGES_dm_abc');
    expect(atRest).not.toBeNull();
    expect(atRest).not.toContain('eagle');
    expect(atRest).not.toContain('content');
    expect(atRest!.startsWith('v1.')).toBe(true);
  });

  it('fails closed under a different session key (GCM auth failure)', async () => {
    const inner = createInMemoryKeyValueStore();
    const keyA = await deriveMessageStorageKey(PRIV_A);
    const keyB = await deriveMessageStorageKey(PRIV_B);

    await createEncryptedKeyValueStore(inner, keyA).setItem('k', MESSAGES);
    await expect(createEncryptedKeyValueStore(inner, keyB).getItem('k')).rejects.toThrow();
  });

  it('uses a fresh IV per write (same plaintext → different ciphertext)', async () => {
    const inner = createInMemoryKeyValueStore();
    const key = await deriveMessageStorageKey(PRIV_A);
    const store = createEncryptedKeyValueStore(inner, key);

    await store.setItem('k', MESSAGES);
    const first = await inner.getItem('k');
    await store.setItem('k', MESSAGES);
    const second = await inner.getItem('k');
    expect(first).not.toBe(second);
  });

  it('passes keys through for multiGet and enumeration', async () => {
    const inner = createInMemoryKeyValueStore();
    const key = await deriveMessageStorageKey(PRIV_A);
    const store = createEncryptedKeyValueStore(inner, key);

    await store.setItem('CHAT_MESSAGES_dm_a', '["a"]');
    await store.setItem('CHAT_MESSAGES_dm_b', '["b"]');
    expect((await store.getAllKeys()).sort()).toEqual(['CHAT_MESSAGES_dm_a', 'CHAT_MESSAGES_dm_b']);
    const rows = await store.multiGet(['CHAT_MESSAGES_dm_a', 'CHAT_MESSAGES_dm_b', 'missing']);
    expect(rows).toEqual([
      ['CHAT_MESSAGES_dm_a', '["a"]'],
      ['CHAT_MESSAGES_dm_b', '["b"]'],
      ['missing', null],
    ]);
  });

  it('deriveMessageStorageKey is non-extractable', async () => {
    const key = await deriveMessageStorageKey(PRIV_A);
    expect(key.extractable).toBe(false);
    await expect(crypto.subtle.exportKey('raw', key)).rejects.toThrow();
  });
});
