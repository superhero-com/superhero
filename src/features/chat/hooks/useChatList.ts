/**
 * useChatList — all data shaping for the chat inbox (`views/InboxView`). Turns
 * the raw DM `Conversation`s (from `useConversations()` + `profilesAtom`) and the
 * authoritative token-gated rooms (`useGatedRooms()`) into the unified
 * {@link ChatListRow} list the view renders. Ported from
 * `superhero-app/src/features/chat/hooks/useChatList.ts`, trimmed to the two
 * planes the PWA ships — DMs and Communities (NIP-28 channels and user groups are
 * out of scope).
 *
 * Tab composition: **All** = communities first (persistent rooms carry no
 * last-message timestamp) then DMs by last activity; **Communities** = rooms
 * only; **DMs** = direct messages only.
 */
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';

import { profilesAtom } from '../domains/profiles/profiles.state';
import { formatContactName, formatMessagePreview } from '../utils/formatters';
import { useChat } from './useChat';
import { useConversations } from './useConversations';
import { useGatedRooms, type GatedRoomSummary } from './useGatedRooms';

export type ChatTab = 'all' | 'communities' | 'dms';

/** A DM row as rendered by the inbox. */
export interface ChatConversation {
  kind: 'dm';
  peerId: string;
  address: string;
  displayName: string;
  chainName: string | null;
  bio: string | null;
  lastMessage?: string;
  lastMessageTimestamp?: number;
  unreadCount: number;
  lastMessageSentByMe: boolean;
  deliveryStatus?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  isRequest?: boolean;
}

/** One row in the unified inbox — a community (token-gated room) or a DM. */
export type ChatListRow =
  | { kind: 'room'; room: GatedRoomSummary }
  | { kind: 'dm'; conversation: ChatConversation };

export interface UseChatListParams {
  activeTab: ChatTab;
  searchQuery: string;
}

export interface UseChatListResult {
  rows: ChatListRow[];
  conversations: ChatConversation[];
  rooms: GatedRoomSummary[];
  counts: { all: number; communities: number; dms: number };
  roomsLoading: boolean;
  refresh: () => Promise<void>;
}

export function useChatList({ activeTab, searchQuery }: UseChatListParams): UseChatListResult {
  const { refreshData, pubkey: myPublicKey } = useChat();
  const { conversations } = useConversations();
  const {
    rooms: gatedRooms, isLoading: roomsLoading, refresh: refreshGatedRooms,
  } = useGatedRooms();
  const profiles = useAtomValue(profilesAtom);

  const dmConversationList = useMemo<ChatConversation[]>(() => conversations
    .filter((conv) => conv.type === 'dm')
    .filter((conv) => !!conv.contact && conv.contact.pubkey !== myPublicKey)
    .map((conv) => {
      const contact = conv.contact!;
      const profile = profiles[contact.pubkey];
      const { lastMessage } = conv;
      const isRequest = !contact.nickname;
      return {
        kind: 'dm' as const,
        peerId: contact.pubkey,
        address: contact.npub || contact.pubkey,
        displayName: formatContactName(contact, profile),
        chainName: profile?.name || null,
        bio: isRequest ? 'New chat request' : (profile?.about || null),
        lastMessage: lastMessage ? formatMessagePreview(lastMessage.content, 50) : undefined,
        lastMessageTimestamp: lastMessage?.createdAt || lastMessage?.timestamp,
        unreadCount: conv.unreadCount,
        lastMessageSentByMe: lastMessage?.isFromMe || false,
        deliveryStatus: lastMessage?.status?.type,
        isRequest,
      };
    }), [conversations, myPublicKey, profiles]);

  const conversationList = useMemo(() => {
    const list = activeTab === 'communities' ? [] : dmConversationList;
    return [...list].sort(
      (a, b) => (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0),
    );
  }, [activeTab, dmConversationList]);

  const conversationsFiltered = useMemo(() => {
    if (!searchQuery.trim()) return conversationList;
    const query = searchQuery.toLowerCase();
    return conversationList.filter((conv) => conv.displayName.toLowerCase().includes(query)
      || conv.address.toLowerCase().includes(query)
      || (conv.lastMessage != null && conv.lastMessage.toLowerCase().includes(query)));
  }, [conversationList, searchQuery]);

  const roomsFiltered = useMemo(() => {
    if (!searchQuery.trim()) return gatedRooms;
    const query = searchQuery.toLowerCase();
    return gatedRooms.filter((room) => room.symbol.toLowerCase().includes(query)
      || room.sale_address.toLowerCase().includes(query));
  }, [gatedRooms, searchQuery]);

  const rows = useMemo<ChatListRow[]>(() => {
    const roomRows: ChatListRow[] = roomsFiltered.map((room) => ({ kind: 'room', room }));
    const dmRows: ChatListRow[] = conversationsFiltered.map(
      (conversation) => ({ kind: 'dm', conversation }),
    );
    if (activeTab === 'communities') return roomRows;
    if (activeTab === 'dms') return dmRows;
    return [...roomRows, ...dmRows];
  }, [activeTab, roomsFiltered, conversationsFiltered]);

  const counts = useMemo(() => ({
    all: dmConversationList.length + gatedRooms.length,
    communities: gatedRooms.length,
    dms: dmConversationList.length,
  }), [dmConversationList.length, gatedRooms.length]);

  const refresh = async () => {
    await Promise.all([refreshData(), refreshGatedRooms()]);
  };

  return {
    rows,
    conversations: conversationsFiltered,
    rooms: roomsFiltered,
    counts,
    roomsLoading,
    refresh,
  };
}
