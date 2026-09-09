/**
 * Contact storage — ported from
 * `superhero-app/src/features/chat/domains/contacts/contacts.storage.ts`.
 *
 * Over the session's encrypted KV store (`../../storage/chat-store`). Contact
 * records carry partner pubkeys / nicknames, so they are sealed at rest with the
 * message history rather than written to plaintext IndexedDB.
 */
import type { Contact, StoredContacts } from '../../core/types';
import { StorageKeys } from '../../core/constants';
import { getChatStore } from '../../storage/chat-store';

/** Persist the full contact map. */
export async function saveContacts(contacts: StoredContacts): Promise<void> {
  await getChatStore().setItem(StorageKeys.CONTACTS, JSON.stringify(contacts));
}

/** Load the contact map, dropping any malformed entries. */
export async function loadContacts(): Promise<StoredContacts> {
  try {
    const data = await getChatStore().getItem(StorageKeys.CONTACTS);
    if (!data) return {};
    const parsed = JSON.parse(data) as Record<string, unknown>;
    const cleaned: StoredContacts = {};
    Object.entries(parsed).forEach(([key, value]) => {
      if (value != null && typeof value === 'object' && 'pubkey' in value) {
        cleaned[key] = value as Contact;
      }
    });
    return cleaned;
  } catch {
    return {};
  }
}

/** Upsert one contact. */
export async function saveContact(pubkey: string, contact: Contact): Promise<void> {
  if (!contact || !contact.pubkey) return;
  const contacts = await loadContacts();
  contacts[pubkey] = contact;
  await saveContacts(contacts);
}

/** Read one contact, or null. */
export async function getContact(pubkey: string): Promise<Contact | null> {
  const contacts = await loadContacts();
  return contacts[pubkey] || null;
}

/** Remove one contact. */
export async function deleteContact(pubkey: string): Promise<void> {
  const contacts = await loadContacts();
  delete contacts[pubkey];
  await saveContacts(contacts);
}
