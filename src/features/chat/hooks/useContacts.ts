/**
 * useContacts — contact list + display-name resolution + profile loading.
 * Ported from `superhero-app/src/features/chat/hooks/useContacts.ts`.
 */
import { useAtomValue } from 'jotai';
import { useCallback, useMemo } from 'react';

import { contactsAtom, contactsListAtom } from '../domains/contacts/contacts.state';
import { profilesAtom } from '../domains/profiles/profiles.state';
import { dmMessagesAtom } from '../domains/direct-messages/dm.state';
import { formatContactName } from '../utils/formatters';
import { useChat } from './useChat';
import type { Contact } from '../core/types';

export function useContacts() {
  const contacts = useAtomValue(contactsAtom);
  const contactsList = useAtomValue(contactsListAtom);
  const profiles = useAtomValue(profilesAtom);
  const dmMessages = useAtomValue(dmMessagesAtom);
  const { contactService, profileService } = useChat();

  const activeContacts = useMemo(
    () => contactsList.filter((contact) => (dmMessages[contact.pubkey]?.length ?? 0) > 0),
    [contactsList, dmMessages],
  );

  const getContact = useCallback(
    (pubkey: string): Contact | undefined => contacts[pubkey],
    [contacts],
  );

  const getContactDisplayName = useCallback((pubkey: string): string => {
    const contact = contacts[pubkey];
    if (!contact) return 'Unknown';
    return formatContactName(contact, profiles[pubkey]);
  }, [contacts, profiles]);

  const updateContactNickname = useCallback(async (pubkey: string, nickname: string) => {
    if (!contactService) throw new Error('Contact service not available');
    await contactService.updateNickname(pubkey, nickname);
  }, [contactService]);

  const loadContactProfile = useCallback(async (pubkey: string) => {
    if (!profileService) throw new Error('Profile service not available');
    await profileService.fetchProfile(pubkey);
  }, [profileService]);

  const deleteContact = useCallback(async (pubkey: string) => {
    if (!contactService) throw new Error('Contact service not available');
    await contactService.deleteContact(pubkey);
  }, [contactService]);

  return {
    contacts: contactsList,
    activeContacts,
    contactsMap: contacts,
    getContact,
    getContactDisplayName,
    updateContactNickname,
    loadContactProfile,
    deleteContact,
    contactCount: contactsList.length,
    activeContactCount: activeContacts.length,
  };
}
