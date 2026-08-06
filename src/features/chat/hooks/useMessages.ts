/**
 * useMessages — messages + send + read state for one DM conversation.
 * Ported from `superhero-app/src/features/chat/hooks/useMessages.ts` (the
 * GiftedChat-specific `messagesForGiftedChat` is kept as a newest-first array the
 * web thread renders in reverse).
 */
import { useAtom, useSetAtom } from 'jotai';
import { useCallback, useEffect, useMemo } from 'react';

import { dmMessagesAtom } from '../domains/direct-messages/dm.state';
import { unreadCountsAtom } from '../domains/conversations/conversations.state';
import { activeConversationIdAtom } from '../domains/ui.state';
import { clearUnreadCount } from '../domains/conversations/conversations.storage';
import {
  loadMessages as loadDMMessages,
  markAsRead as persistReadReceipt,
} from '../domains/direct-messages/dm.storage';
import { parseConversationId } from '../utils/converters';
import { useChat } from './useChat';
import type { ConversationMessage } from '../core/types';

export function useMessages(conversationId?: string) {
  const [dmMessages, setDMMessages] = useAtom(dmMessagesAtom);
  const [unreadCounts, setUnreadCounts] = useAtom(unreadCountsAtom);
  const setActiveConversationId = useSetAtom(activeConversationIdAtom);
  const { dmService } = useChat();

  const conversationType = useMemo(() => {
    if (!conversationId) return null;
    try {
      return parseConversationId(conversationId);
    } catch {
      return null;
    }
  }, [conversationId]);

  const messages = useMemo((): ConversationMessage[] => {
    if (!conversationType) return [];
    return (dmMessages[conversationType.id] || []) as ConversationMessage[];
  }, [conversationType, dmMessages]);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => a.createdAt - b.createdAt),
    [messages],
  );

  const messagesForGiftedChat = useMemo(
    () => [...messages].sort((a, b) => b.createdAt - a.createdAt),
    [messages],
  );

  // Mark the conversation active + hydrate from storage on first open.
  useEffect(() => {
    if (!conversationId || !conversationType) return undefined;
    setActiveConversationId(conversationId);

    const pubkey = conversationType.id;
    if (!dmMessages[pubkey]) {
      loadDMMessages(pubkey).then((loaded) => {
        if (loaded.length > 0) setDMMessages((prev) => ({ ...prev, [pubkey]: loaded }));
      }).catch(() => {});
    }

    if ((unreadCounts[conversationId] || 0) > 0) {
      setUnreadCounts((prev) => ({ ...prev, [conversationId]: 0 }));
      clearUnreadCount(conversationId).catch(() => {});
    }

    return () => setActiveConversationId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, conversationType]);

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationType) throw new Error('No active conversation');
    if (!dmService) throw new Error('DM service not available');
    const pubkey = conversationType.id;
    const message = await dmService.sendMessage(pubkey, content);
    setDMMessages((prev) => {
      const existing = prev[pubkey] || [];
      const isDuplicate = existing.some((m) => m.id === message.id
        || (m.eventId && message.eventId && m.eventId === message.eventId));
      if (isDuplicate) return prev;
      return { ...prev, [pubkey]: [...existing, message] };
    });
  }, [conversationType, dmService, setDMMessages]);

  const markAsRead = useCallback(async (messageId: string) => {
    if (!conversationType) return;
    await persistReadReceipt(conversationType.id, messageId);
  }, [conversationType]);

  const unreadCount = conversationId ? unreadCounts[conversationId] || 0 : 0;
  const lastMessage = sortedMessages[sortedMessages.length - 1];

  return {
    messages: sortedMessages,
    messagesForGiftedChat,
    sendMessage,
    markAsRead,
    unreadCount,
    lastMessage,
  };
}
