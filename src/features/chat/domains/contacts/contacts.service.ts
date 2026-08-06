/**
 * Contact service — ported from
 * `superhero-app/src/features/chat/domains/contacts/contacts.service.ts`.
 *
 * The app service took a `UserKeys` in its constructor but never read the secret
 * — contact records are derived purely from a public key. The web service drops
 * the key dependency entirely (no raw key held), keeping the same method surface.
 */
/* eslint-disable class-methods-use-this -- thin instance-method facade over the
   module storage functions; kept as methods to match the ported app API 1:1. */
import type { Contact } from '../../core/types';
import { hexToNpub } from '../../utils/converters';
import { isValidPubkey } from '../../utils/validators';
import {
  saveContact, getContact, deleteContact, loadContacts,
} from './contacts.storage';

export class ContactService {
  /** Create (or overwrite) a contact from a pubkey. */
  async addContact(pubkey: string, nickname?: string): Promise<Contact> {
    if (!isValidPubkey(pubkey)) {
      throw new Error('Invalid public key');
    }
    const contact: Contact = {
      pubkey,
      npub: hexToNpub(pubkey),
      nickname,
      lastSeen: Date.now(),
    };
    await saveContact(pubkey, contact);
    return contact;
  }

  /** Set a local nickname on an existing contact. */
  async updateNickname(pubkey: string, nickname: string): Promise<void> {
    const contact = await getContact(pubkey);
    if (!contact) throw new Error('Contact not found');
    await saveContact(pubkey, { ...contact, nickname });
  }

  /** Remove a contact. */
  async deleteContact(pubkey: string): Promise<void> {
    await deleteContact(pubkey);
  }

  /** Read one contact. */
  async getContact(pubkey: string): Promise<Contact | null> {
    return getContact(pubkey);
  }

  /** All contacts as an array. */
  async getAllContacts(): Promise<Contact[]> {
    return Object.values(await loadContacts());
  }

  /** Return the existing contact, auto-creating a minimal one from messages. */
  async ensureContact(pubkey: string): Promise<Contact> {
    const contact = await getContact(pubkey);
    if (contact) return contact;
    return this.addContact(pubkey);
  }
}
