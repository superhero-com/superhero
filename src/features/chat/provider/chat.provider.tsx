/**
 * Chat provider — ported from
 * `superhero-app/src/features/chat/provider/chat.provider.tsx`.
 *
 * Orchestrates the DM plane: multi-phase startup, relay lifecycle, the account-
 * switch guard, and the periodic/visibility reconciliation. Two web-specific
 * adaptations to the mobile original:
 *
 *  1. **Custody.** The transport signs and decrypts ONLY through the revocable
 *     room session identity (`useRoomSession`), never a raw `UserKeys`. When the
 *     session locks (explicit / 30-min idle / tab teardown) services are torn
 *     down and every in-memory atom is cleared, so no plaintext DM survives lock.
 *  2. **Storage.** History is sealed at rest under a non-extractable key derived
 *     from the session nostr secret (`deriveMessageStorageKey`), bound as the
 *     one session KV store (`setChatStore`).
 *
 * Mount this ABOVE the router (see `App.tsx`) so the relay pool survives route
 * changes — a page reload still pays full startup, but in-app navigation does not.
 */
import React, {
  createContext, useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

import { useAccount } from '@/hooks';
import { NostrClient } from '../nostr/nostr-client';
import { NostrEventHandler } from '../nostr/event-handler';
import { DirectMessageService } from '../domains/direct-messages/dm.service';
import { ContactService } from '../domains/contacts/contacts.service';
import { ProfileService } from '../domains/profiles/profiles.service';
import { dmMessagesAtom } from '../domains/direct-messages/dm.state';
import { profilesAtom } from '../domains/profiles/profiles.state';
import { contactsAtom } from '../domains/contacts/contacts.state';
import { unreadCountsAtom, chatManifestAtom } from '../domains/conversations/conversations.state';
import {
  chatStatusAtom, relaysAtom, connectedRelaysAtom, activeConversationIdAtom,
  isSyncReadyAtom, isSyncDoneAtom,
} from '../domains/ui.state';
import { loadContacts } from '../domains/contacts/contacts.storage';
import { loadMessages as loadDMMessages } from '../domains/direct-messages/dm.storage';
import { loadProfiles, saveProfile } from '../domains/profiles/profiles.storage';
import {
  incrementUnreadCount, getChatManifest, loadUnreadCounts, clearAllConversationData,
} from '../domains/conversations/conversations.storage';
import { getDMConversationId } from '../utils/converters';
import { Timing } from '../core/constants';
import { filterAllowedRelays } from '../core/relay-config';
import type {
  Profile, NostrFilter, StoredProfiles,
} from '../core/types';
import { deriveMessageStorageKey } from '../storage/message-storage-key';
import { createIndexedDbKeyValueStore } from '../storage/kv-store';
import { createEncryptedKeyValueStore } from '../storage/encrypted-kv-store';
import { setChatStore, clearChatStore } from '../storage/chat-store';
import { roomKeySession, lockRoomSession } from '../session/room-session';
import { useRoomSession } from '../hooks/useRoomSession';
import { useChatServiceWorker } from '../hooks/useChatServiceWorker';
import type { NostrIdentityProvider } from '../identity/nostr-identity';

export interface ChatContextValue {
  isConnected: boolean;
  isInitializing: boolean;
  pubkey: string | null;
  profile: Profile | null;
  connectedRelays: string[];
  error: string | null;
  dmService: DirectMessageService | null;
  contactService: ContactService | null;
  profileService: ProfileService | null;
  refreshData: () => Promise<void>;
}

export const ChatContext = createContext<ChatContextValue | null>(null);

export const ChatProvider = ({ children }: { children: React.ReactNode }) => {
  const { activeAccount } = useAccount();
  const session = useRoomSession();

  const [status, setStatus] = useAtom(chatStatusAtom);
  // Transport safety net: only open sockets to allowlisted origins, even if an
  // off-list relay was persisted by an older build. The seed, the room-config
  // hook and the settings screen are gated too; this is the last line.
  const persistedRelays = useAtomValue(relaysAtom);
  const relays = useMemo(() => filterAllowedRelays(persistedRelays), [persistedRelays]);
  const [connectedRelays, setConnectedRelays] = useAtom(connectedRelaysAtom);
  const [profiles, setProfiles] = useAtom(profilesAtom);
  const setDMMessages = useSetAtom(dmMessagesAtom);
  const setContacts = useSetAtom(contactsAtom);
  const setUnreadCounts = useSetAtom(unreadCountsAtom);
  const setChatManifest = useSetAtom(chatManifestAtom);
  const setSyncReady = useSetAtom(isSyncReadyAtom);
  const setSyncDone = useSetAtom(isSyncDoneAtom);
  const activeConversationId = useAtomValue(activeConversationIdAtom);
  const syncDone = useAtomValue(isSyncDoneAtom);

  const clientRef = useRef<NostrClient | null>(null);
  const eventHandlerRef = useRef<NostrEventHandler | null>(null);
  const dmServiceRef = useRef<DirectMessageService | null>(null);
  const contactServiceRef = useRef<ContactService | null>(null);
  const profileServiceRef = useRef<ProfileService | null>(null);

  // The account + identity the running services belong to (account-switch guard).
  const startedAccountRef = useRef<string | null>(null);
  const startedPubkeyRef = useRef<string | null>(null);

  // Latest values the async event callbacks must read without going stale.
  const activeConversationIdRef = useRef<string | null>(null);
  const profilesRef = useRef<StoredProfiles>({});
  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);
  useEffect(() => { profilesRef.current = profiles; }, [profiles]);

  const [since, setSince] = useState<number>(0);
  const sinceRef = useRef(0);
  useEffect(() => { sinceRef.current = since; }, [since]);

  const clearAtoms = useCallback(() => {
    setDMMessages({});
    setProfiles({});
    setContacts({});
    setUnreadCounts({});
    setChatManifest({});
    setSyncReady(false);
    setSyncDone(false);
    setSince(0);
  }, [
    setDMMessages, setProfiles, setContacts, setUnreadCounts, setChatManifest,
    setSyncReady, setSyncDone,
  ]);

  const stopServices = useCallback(() => {
    clientRef.current?.destroy();
    clientRef.current = null;
    eventHandlerRef.current = null;
    dmServiceRef.current = null;
    contactServiceRef.current = null;
    profileServiceRef.current = null;
    clearChatStore();
    clearAtoms();
    setConnectedRelays([]);
    setStatus((prev) => ({ ...prev, isConnected: false, isInitializing: false }));
  }, [clearAtoms, setConnectedRelays, setStatus]);

  const startServices = useCallback(async (
    pubkey: string,
    identity: NostrIdentityProvider,
  ) => {
    setStatus((prev) => ({ ...prev, isInitializing: true, error: null }));

    // Seal history at rest under the session-derived, non-extractable key.
    const privateKey = roomKeySession.keys?.privateKey;
    if (!privateKey) throw new Error('Chat session is locked.');
    const storageKey = await deriveMessageStorageKey(privateKey);
    setChatStore(createEncryptedKeyValueStore(createIndexedDbKeyValueStore(), storageKey));

    const client = new NostrClient(identity, relays);
    clientRef.current = client;
    dmServiceRef.current = new DirectMessageService(client, identity);
    contactServiceRef.current = new ContactService();
    profileServiceRef.current = new ProfileService(client, identity);

    const eventHandler = new NostrEventHandler(identity, {
      onDirectMessage: async (event, decrypted, otherPubkey) => {
        try {
          const message = await dmServiceRef.current!.processIncomingDM(
            event,
            decrypted,
            otherPubkey,
          );
          setDMMessages((prev) => {
            const existing = prev[otherPubkey] || [];
            const isDuplicate = existing.some((m) => m.id === message.id
              || (m.eventId && message.eventId && m.eventId === message.eventId));
            if (isDuplicate) return prev;
            return { ...prev, [otherPubkey]: [...existing, message] };
          });

          const conversationId = getDMConversationId(otherPubkey);
          setChatManifest((prev) => ({
            ...prev,
            [conversationId]: { type: 'dm', pubkey: otherPubkey, lastActivity: Date.now() },
          }));

          if (activeConversationIdRef.current !== conversationId && !message.isFromMe) {
            await incrementUnreadCount(conversationId);
            setUnreadCounts((prev) => ({
              ...prev,
              [conversationId]: (prev[conversationId] || 0) + 1,
            }));
          }

          const contact = await contactServiceRef.current!.ensureContact(otherPubkey);
          setContacts((prev) => ({ ...prev, [otherPubkey]: contact }));

          if (!profilesRef.current[otherPubkey]) {
            const profile = await profileServiceRef.current!.fetchProfile(otherPubkey);
            if (profile) setProfiles((prev) => ({ ...prev, [otherPubkey]: profile }));
            clientRef.current?.subscribe([{ authors: [otherPubkey], kinds: [0] }]);
          }
        } catch {
          // a single malformed DM must not break the queue
        }
      },
      onProfile: async (pubkey_, profile) => {
        setProfiles((prev) => ({ ...prev, [pubkey_]: { ...profile } }));
        await saveProfile(pubkey_, profile);
      },
      onReaction: () => {},
      onEventDeleted: () => {},
    });
    eventHandlerRef.current = eventHandler;

    client.on('event', (event) => eventHandler.queueEvent(event));
    client.on('connected', (relay) => {
      setConnectedRelays((prev) => [...new Set([...prev, relay])]);
    });
    client.on('disconnected', (relay) => {
      setConnectedRelays((prev) => prev.filter((r) => r !== relay));
    });

    // Phase 0 — load persisted state.
    const storedContacts = await loadContacts();
    const contactPubkeys = Object.keys(storedContacts);
    if (contactPubkeys.length > 0) setContacts(storedContacts);
    const storedProfiles = await loadProfiles();
    if (Object.keys(storedProfiles).length > 0) setProfiles(storedProfiles);
    const storedUnread = await loadUnreadCounts();
    if (Object.keys(storedUnread).length > 0) setUnreadCounts(storedUnread);

    const manifest = await getChatManifest();
    setChatManifest(manifest);
    await Promise.all(Object.values(manifest).map(async (info) => {
      if (info && info.type === 'dm' && info.pubkey) {
        const messages = await loadDMMessages(info.pubkey);
        if (messages.length > 0) {
          setDMMessages((prev) => ({ ...prev, [info.pubkey!]: messages }));
        }
      }
    }));

    if (contactPubkeys.length > 0) {
      const profileEvents = await client.fetchEvents([
        { authors: contactPubkeys, kinds: [0], limit: contactPubkeys.length },
      ]);
      profileEvents.forEach((e) => eventHandler.queueEvent(e));
    }

    // Phase 1 — own events.
    const userEvents = await client.fetchEvents([{ authors: [pubkey] }]);
    userEvents.forEach((e) => eventHandler.queueEvent(e));
    setSyncReady(true);

    // Phase 2 — incoming DMs.
    const incomingDMs = await client.fetchEvents([{ kinds: [4], '#p': [pubkey] }]);
    incomingDMs.forEach((e) => eventHandler.queueEvent(e));
    setSyncDone(true);

    // Live subscription.
    const filters: NostrFilter[] = [
      { authors: [pubkey], kinds: [0, 4] },
      { kinds: [4], '#p': [pubkey] },
    ];
    if (contactPubkeys.length > 0) filters.push({ authors: contactPubkeys, kinds: [0] });
    client.subscribe(filters);

    setStatus({
      isConnected: true,
      isInitializing: false,
      keys: null,
      relays,
      connectedRelays: Object.keys(relays),
      error: null,
      lastActivity: Date.now(),
    });
  }, [
    relays, setStatus, setConnectedRelays, setDMMessages, setProfiles, setContacts,
    setUnreadCounts, setChatManifest, setSyncReady, setSyncDone,
  ]);

  const refreshData = useCallback(async () => {
    const client = clientRef.current;
    const pubkey = startedPubkeyRef.current;
    if (!client || !pubkey) return;
    try {
      const currentContacts = await loadContacts();
      const contactPubkeys = Object.keys(currentContacts);
      const filters: NostrFilter[] = [
        { authors: [pubkey] },
        { kinds: [4], '#p': [pubkey] },
      ];
      if (contactPubkeys.length > 0) filters.push({ authors: contactPubkeys, kinds: [0] });
      const events = await client.fetchEvents(filters);
      events.forEach((e) => eventHandlerRef.current?.queueEvent(e));
      setSince(Date.now());
    } catch {
      // best-effort reconciliation
    }
  }, []);

  // Startup / account-switch / lock orchestration.
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      // Account switch: fires even if the (stale) session still holds the old
      // key. Drop the key, wipe persisted + in-memory data, then wait for a
      // fresh unlock of the new account.
      if (startedAccountRef.current && startedAccountRef.current !== activeAccount) {
        lockRoomSession();
        stopServices();
        await clearAllConversationData();
        startedAccountRef.current = null;
        startedPubkeyRef.current = null;
        return;
      }

      const { pubkey, identity, isUnlocked } = session;
      if (!activeAccount || !isUnlocked || !pubkey || !identity) {
        if (startedPubkeyRef.current) {
          stopServices();
          startedPubkeyRef.current = null;
          startedAccountRef.current = null;
        }
        return;
      }

      if (startedPubkeyRef.current === pubkey) return;

      startedAccountRef.current = activeAccount;
      startedPubkeyRef.current = pubkey;
      try {
        await startServices(pubkey, identity);
      } catch (error) {
        if (cancelled) return;
        startedPubkeyRef.current = null;
        stopServices();
        setStatus((prev) => ({
          ...prev,
          isConnected: false,
          isInitializing: false,
          error: error instanceof Error ? error.message : 'Failed to start chat',
        }));
      }
    };
    sync();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccount, session.isUnlocked, session.pubkey]);

  // Periodic reconciliation (a backgrounded tab throttles this timer, so the
  // visibility handler below is the real catch-up path on the web).
  useEffect(() => {
    if (!syncDone || !startedPubkeyRef.current) return undefined;
    const delay = sinceRef.current === 0
      ? Timing.INITIAL_FETCH_DELAY_MS
      : Timing.PERIODIC_FETCH_INTERVAL_MS;
    const timer = setTimeout(() => { refreshData(); }, delay);
    return () => clearTimeout(timer);
  }, [since, syncDone, refreshData]);

  // Reconcile on tab focus — a browser tab that was backgrounded may have missed
  // live events while its socket/timer were throttled.
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden && syncDone && startedPubkeyRef.current) refreshData();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [syncDone, refreshData]);

  // Push relay-set edits (from the settings screen) into the running client so
  // subsequent reads/writes use them without a session restart. No-op until the
  // client exists; startup already seeds the client from the same atom.
  useEffect(() => { clientRef.current?.updateRelays(relays); }, [relays]);

  // Teardown on unmount.
  useEffect(() => () => { clientRef.current?.destroy(); }, []);

  // Scoped to /chat, and registered only once the user is on a chat route — see
  // the hook for why a visitor who never opens chat must not carry the worker.
  useChatServiceWorker(Object.keys(relays).length);

  const value = useMemo<ChatContextValue>(() => ({
    isConnected: status.isConnected,
    isInitializing: status.isInitializing,
    pubkey: startedPubkeyRef.current,
    profile: session.pubkey ? profiles[session.pubkey] ?? null : null,
    connectedRelays,
    error: status.error,
    dmService: dmServiceRef.current,
    contactService: contactServiceRef.current,
    profileService: profileServiceRef.current,
    refreshData,
  }), [
    status.isConnected, status.isInitializing, status.error,
    session.pubkey, profiles, connectedRelays, refreshData,
  ]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};
