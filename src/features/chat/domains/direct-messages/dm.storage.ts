/**
 * Direct message storage — ported from
 * `superhero-app/src/features/chat/domains/direct-messages/dm.storage.ts`.
 *
 * Persistence of DM history + read receipts + manifest, over the session's
 * ENCRYPTED KV store (`../../storage/chat-store`) instead of AsyncStorage. Key
 * names are identical to the app so the layout is 1:1; the app's `console.error`
 * diagnostics are dropped for the web build's no-console rule (reads fall back to
 * empty, writes rethrow).
 */
import type { DirectMessage, ChatManifest } from '../../core/types';
import { StorageKeys } from '../../core/constants';
import { getChatStore } from '../../storage/chat-store';

function getMessagesKey(pubkey: string): string {
  return `${StorageKeys.MESSAGES_PREFIX}_dm_${pubkey}`;
}

function getReadReceiptsKey(pubkey: string): string {
  return `${StorageKeys.READ_RECEIPTS_PREFIX}_dm_${pubkey}`;
}

/** Persist the full message array for a DM conversation. */
export async function saveMessages(pubkey: string, messages: DirectMessage[]): Promise<void> {
  await getChatStore().setItem(getMessagesKey(pubkey), JSON.stringify(messages));
}

/** Load the message array for a DM conversation (empty on miss / parse error). */
export async function loadMessages(pubkey: string): Promise<DirectMessage[]> {
  try {
    const data = await getChatStore().getItem(getMessagesKey(pubkey));
    return data ? (JSON.parse(data) as DirectMessage[]) : [];
  } catch {
    return [];
  }
}

/** Update the manifest entry for a DM (best-effort — never throws). */
async function updateManifestForDM(pubkey: string): Promise<void> {
  try {
    const store = getChatStore();
    const data = await store.getItem(StorageKeys.CHAT_MANIFEST);
    const manifest: ChatManifest = data ? JSON.parse(data) : {};
    manifest[`dm_${pubkey}`] = { type: 'dm', pubkey, lastActivity: Date.now() };
    await store.setItem(StorageKeys.CHAT_MANIFEST, JSON.stringify(manifest));
  } catch {
    // manifest is a convenience index; a write failure is non-fatal
  }
}

/** Append one message and refresh the manifest. */
export async function appendMessage(pubkey: string, message: DirectMessage): Promise<void> {
  const messages = await loadMessages(pubkey);
  messages.push(message);
  await saveMessages(pubkey, messages);
  await updateManifestForDM(pubkey);
}

/** Patch a single message in place (by `id`). */
export async function updateMessage(
  pubkey: string,
  messageId: string,
  updates: Partial<DirectMessage>,
): Promise<void> {
  const messages = await loadMessages(pubkey);
  const index = messages.findIndex((m) => m.id === messageId);
  if (index !== -1) {
    messages[index] = { ...messages[index], ...updates };
    await saveMessages(pubkey, messages);
  }
}

/** Remove a single message (by `id`). */
export async function deleteMessage(pubkey: string, messageId: string): Promise<void> {
  const messages = await loadMessages(pubkey);
  await saveMessages(pubkey, messages.filter((m) => m.id !== messageId));
}

/** Clear all messages for a conversation. */
export async function clearMessages(pubkey: string): Promise<void> {
  await getChatStore().removeItem(getMessagesKey(pubkey));
}

/** Record a local read receipt for a message. */
export async function markAsRead(pubkey: string, messageId: string): Promise<void> {
  const store = getChatStore();
  const key = getReadReceiptsKey(pubkey);
  const data = await store.getItem(key);
  const receipts: Record<string, number> = data ? JSON.parse(data) : {};
  receipts[messageId] = Date.now();
  await store.setItem(key, JSON.stringify(receipts));
}

/** Read the local read receipts for a conversation. */
export async function getReadReceipts(pubkey: string): Promise<Record<string, number>> {
  try {
    const data = await getChatStore().getItem(getReadReceiptsKey(pubkey));
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}
