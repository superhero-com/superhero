/**
 * useRecentChats — the on-device "recently opened chats" list, keyed by the
 * active nostr pubkey. Ported from
 * `superhero-app/src/features/chat/hooks/useRecentChats.ts`.
 *
 * Session-scoped (in-memory) on the web build — see `../domains/recents/recents.state`
 * for why it is not persisted to plaintext IndexedDB.
 */
import { useAtom } from 'jotai';
import { useCallback, useMemo } from 'react';

import {
  MAX_RECENT_CHATS, recentChatsAtom, type RecentChat,
} from '../domains/recents/recents.state';
import { useChat } from './useChat';

export type { RecentChat, RecentChatKind } from '../domains/recents/recents.state';

export interface UseRecentChatsResult {
  recents: RecentChat[];
  record: (entry: Omit<RecentChat, 'at'>) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export function useRecentChats(): UseRecentChatsResult {
  const { pubkey } = useChat();
  const owner = pubkey ?? '';
  const [store, setStore] = useAtom(recentChatsAtom);

  const recents = useMemo(() => (owner ? store[owner] ?? [] : []), [store, owner]);

  const record = useCallback((entry: Omit<RecentChat, 'at'>) => {
    if (!owner || !entry.id) return;
    setStore((prev) => {
      const list = prev[owner] ?? [];
      const next = [
        { ...entry, at: Date.now() },
        ...list.filter((r) => r.id !== entry.id),
      ].slice(0, MAX_RECENT_CHATS);
      return { ...prev, [owner]: next };
    });
  }, [owner, setStore]);

  const remove = useCallback((id: string) => {
    if (!owner) return;
    setStore((prev) => ({ ...prev, [owner]: (prev[owner] ?? []).filter((r) => r.id !== id) }));
  }, [owner, setStore]);

  const clear = useCallback(() => {
    if (!owner) return;
    setStore((prev) => ({ ...prev, [owner]: [] }));
  }, [owner, setStore]);

  return {
    recents, record, remove, clear,
  };
}
