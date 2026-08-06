/**
 * chat-store.ts — the session-scoped KV binding the ported DM `*.storage.ts`
 * services read and write through.
 *
 * The mobile services talk to a module-level `AsyncStorage` singleton. The web
 * build binds an equivalent singleton here, but points it at the
 * ENCRYPTED-at-rest store (`createEncryptedKeyValueStore`) whose AES key is the
 * non-extractable, session-scoped key derived from the nostr secret
 * (`deriveMessageStorageKey`). The `ChatProvider` sets the binding at startup
 * (after unlock) and clears it on stop/lock, so with the session locked there is
 * no key in memory and IndexedDB holds ciphertext only.
 *
 * All chat domain data (messages, contacts, profiles, manifest, unread counts,
 * recents) goes through this one sealed store — a passive IndexedDB read yields
 * ciphertext, never partner names / profile fields in the clear. Only the KEY
 * NAMES leak (the accepted R-09 residual).
 */
import type { KeyValueStore } from './kv-store';

let store: KeyValueStore | null = null;

/** Bind the session's encrypted KV store. Called by `ChatProvider` on startup. */
export function setChatStore(next: KeyValueStore): void {
  store = next;
}

/** Drop the store binding (on stop / lock / teardown). */
export function clearChatStore(): void {
  store = null;
}

/** The current session store, or throw when chat is locked / uninitialised. */
export function getChatStore(): KeyValueStore {
  if (!store) {
    throw new Error('Chat storage is not initialised — unlock chat first.');
  }
  return store;
}

/** Whether a session store is currently bound. */
export function hasChatStore(): boolean {
  return store !== null;
}
