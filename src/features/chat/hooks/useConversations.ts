/**
 * useConversations — the DM inbox list + unread totals.
 * Ported from `superhero-app/src/features/chat/hooks/useConversations.ts`.
 */
import { useAtomValue } from 'jotai';
import { useMemo } from 'react';

import {
  conversationsAtom, totalUnreadCountAtom, conversationCountAtom,
} from '../domains/conversations/conversations.state';

export function useConversations() {
  const conversations = useAtomValue(conversationsAtom);
  const totalUnreadCount = useAtomValue(totalUnreadCountAtom);
  const conversationCount = useAtomValue(conversationCountAtom);

  const dmConversations = useMemo(
    () => conversations.filter((c) => c.type === 'dm'),
    [conversations],
  );

  return {
    conversations,
    dmConversations,
    totalUnreadCount,
    conversationCount,
  };
}
