/**
 * Contact Jotai state — ported from
 * `superhero-app/src/features/chat/domains/contacts/contacts.state.ts`.
 *
 * In-memory (the encrypted store is the persistence layer; the `ChatProvider`
 * seeds this on startup and clears it on stop/lock).
 */
import { atom } from 'jotai';
import type { Contact, StoredContacts } from '../../core/types';

/** Contacts keyed by hex pubkey. */
export const contactsAtom = atom<StoredContacts>({});

/** Contacts as an array (drops null holes). */
export const contactsListAtom = atom((get) => Object.values(get(contactsAtom))
  .filter((c): c is Contact => c != null));

/** Read one contact reactively. */
export const getContactAtom = (pubkey: string) => atom(
  (get) => get(contactsAtom)[pubkey] || null,
);
