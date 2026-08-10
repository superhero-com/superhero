/**
 * Direct message Jotai state — ported from
 * `superhero-app/src/features/chat/domains/direct-messages/dm.state.ts`.
 *
 * In-memory only (as on mobile): the reactive mirror of the encrypted-at-rest DM
 * history. The `ChatProvider` seeds it from storage on startup and clears it on
 * stop/lock, so no plaintext DM lingers in memory once chat is locked.
 */
import { atom } from 'jotai';
import type { DirectMessage } from '../../core/types';

/** DM history keyed by conversation-partner hex pubkey. */
export const dmMessagesAtom = atom<Record<string, DirectMessage[]>>({});

/** Read/write the message array for one conversation. */
export const getDMMessagesAtom = (pubkey: string) => atom(
  (get) => get(dmMessagesAtom)[pubkey] || [],
  (get, set, messages: DirectMessage[]) => {
    set(dmMessagesAtom, { ...get(dmMessagesAtom), [pubkey]: messages });
  },
);

/** Messages for one conversation, oldest first. */
export const getSortedDMMessagesAtom = (pubkey: string) => atom((get) => {
  const messages = get(getDMMessagesAtom(pubkey));
  return [...messages].sort((a, b) => a.createdAt - b.createdAt);
});

/** The most recent message for one conversation, or undefined. */
export const getLastDMMessageAtom = (pubkey: string) => atom((get) => {
  const messages = get(getSortedDMMessagesAtom(pubkey));
  return messages.length > 0 ? messages[messages.length - 1] : undefined;
});
