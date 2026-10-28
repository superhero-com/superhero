import {
  afterEach, describe, expect, it,
} from 'vitest';

import { loadProfiles, saveProfile } from '../domains/profiles/profiles.storage';
import { clearChatStore, setChatStore } from '../storage/chat-store';
import { createInMemoryKeyValueStore } from '../storage/kv-store';

describe('profile storage', () => {
  afterEach(() => clearChatStore());

  it('keeps every profile when several are saved at once', async () => {
    setChatStore(createInMemoryKeyValueStore());

    await Promise.all([
      saveProfile('a', { name: 'Alice' }),
      saveProfile('b', { name: 'Bob' }),
      saveProfile('c', { name: 'Carol' }),
    ]);

    expect(await loadProfiles()).toEqual({
      a: { name: 'Alice' }, b: { name: 'Bob' }, c: { name: 'Carol' },
    });
  });

  it('writes nothing once chat is locked, and saves again after unlock', async () => {
    await expect(saveProfile('a', { name: 'Alice' })).rejects.toThrow();

    setChatStore(createInMemoryKeyValueStore());
    await saveProfile('b', { name: 'Bob' });

    expect(await loadProfiles()).toEqual({ b: { name: 'Bob' } });
  });
});
