/**
 * useChat — access the DM `ChatContext` (throws outside `<ChatProvider>`).
 * Ported from `superhero-app/src/features/chat/hooks/useChat.ts`.
 */
import { useContext } from 'react';
import { ChatContext, type ChatContextValue } from '../provider/chat.provider';

export function useChat(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}
