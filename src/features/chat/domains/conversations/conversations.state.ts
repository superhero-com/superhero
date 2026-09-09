/**
 * Conversation Jotai state — ported from
 * `superhero-app/src/features/chat/domains/conversations/conversations.state.ts`.
 *
 * `conversationsAtom` derives the DM inbox from contacts + in-memory DM history +
 * unread counts, sorted by last activity. Unread counts and the manifest are
 * in-memory mirrors of the encrypted store (the app's verbose `console.log`
 * tracing is dropped).
 */
import { atom } from 'jotai';
import type { Conversation, StoredUnreadCounts, ChatManifest } from '../../core/types';
import { contactsAtom } from '../contacts/contacts.state';
import { dmMessagesAtom } from '../direct-messages/dm.state';
import { hexToNpub } from '../../utils/converters';

/** Per-conversation unread counts. */
export const unreadCountsAtom = atom<StoredUnreadCounts>({});

/** Which conversations exist + last activity. */
export const chatManifestAtom = atom<ChatManifest>({});

/** DM conversations (those with at least one message), newest activity first. */
export const conversationsAtom = atom<Conversation[]>((get) => {
  const contacts = get(contactsAtom);
  const dmMessages = get(dmMessagesAtom);
  const unreadCounts = get(unreadCountsAtom);

  const conversations: Conversation[] = [];
  Object.keys(dmMessages).forEach((pubkey) => {
    const messages = dmMessages[pubkey];
    if (!messages || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const conversationId = `dm_${pubkey}`;
    // A conversation with no contact record yet is a chat request — synthesise a
    // minimal contact so it still shows in the inbox.
    const contact = contacts[pubkey] ?? { pubkey, npub: hexToNpub(pubkey) };

    conversations.push({
      type: 'dm',
      contactPubkey: pubkey,
      contact,
      lastMessage,
      unreadCount: unreadCounts[conversationId] || 0,
      lastActivity: lastMessage.createdAt || lastMessage.timestamp,
    });
  });

  return conversations.sort((a, b) => b.lastActivity - a.lastActivity);
});

/** Total unread across all conversations. */
export const totalUnreadCountAtom = atom((get) => Object.values(get(unreadCountsAtom))
  .reduce((sum, count) => sum + count, 0));

/** Number of active conversations. */
export const conversationCountAtom = atom((get) => get(conversationsAtom).length);
