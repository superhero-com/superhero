/**
 * Conversation storage — ported from
 * `superhero-app/src/features/chat/domains/conversations/conversations.storage.ts`.
 *
 * Unread counts + chat manifest over the session's encrypted KV store, plus the
 * account-switch data wipe. `clearAllConversationData` is the security-critical
 * one: it removes every `CHAT_`/`NOSTR_` record so one account's DMs never leak
 * into another's inbox after a wallet switch.
 */
import type { StoredUnreadCounts, ChatManifest } from '../../core/types';
import { StorageKeys } from '../../core/constants';
import { getChatStore, hasChatStore } from '../../storage/chat-store';

// ---- Unread counts ----------------------------------------------------------

/** Persist all unread counts. */
export async function saveUnreadCounts(counts: StoredUnreadCounts): Promise<void> {
  await getChatStore().setItem(StorageKeys.UNREAD_COUNTS, JSON.stringify(counts));
}

/** Load all unread counts. */
export async function loadUnreadCounts(): Promise<StoredUnreadCounts> {
  try {
    const data = await getChatStore().getItem(StorageKeys.UNREAD_COUNTS);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/** Increment one conversation's unread count. */
export async function incrementUnreadCount(conversationId: string): Promise<void> {
  const counts = await loadUnreadCounts();
  counts[conversationId] = (counts[conversationId] || 0) + 1;
  await saveUnreadCounts(counts);
}

/** Reset one conversation's unread count to zero. */
export async function clearUnreadCount(conversationId: string): Promise<void> {
  const counts = await loadUnreadCounts();
  counts[conversationId] = 0;
  await saveUnreadCounts(counts);
}

// ---- Chat manifest ----------------------------------------------------------

/** Read the chat manifest (which conversations exist). */
export async function getChatManifest(): Promise<ChatManifest> {
  try {
    const data = await getChatStore().getItem(StorageKeys.CHAT_MANIFEST);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

/** Persist the chat manifest. */
export async function saveChatManifest(manifest: ChatManifest): Promise<void> {
  await getChatStore().setItem(StorageKeys.CHAT_MANIFEST, JSON.stringify(manifest));
}

// ---- Cleanup ----------------------------------------------------------------

/**
 * Remove every chat record from the store (the account-switch wipe). No-op when
 * no session store is bound (already locked).
 */
export async function clearAllConversationData(): Promise<void> {
  if (!hasChatStore()) return;
  const store = getChatStore();
  const keys = await store.getAllKeys();
  const chatKeys = keys.filter((key) => key.startsWith('CHAT_') || key.startsWith('NOSTR_'));
  if (chatKeys.length > 0) {
    await store.multiRemove(chatKeys);
  }
}
