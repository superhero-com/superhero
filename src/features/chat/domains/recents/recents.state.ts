/**
 * Recently-opened chats — ported from
 * `superhero-app/src/features/chat/domains/recents/recents.state.ts`.
 *
 * Feeds the "Recent" section of the start-a-chat surface. On mobile this is an
 * `atomWithStorage` in plaintext AsyncStorage. On the web build it is kept
 * IN-MEMORY only (session-scoped, keyed by the active nostr pubkey): recents
 * carry partner pubkeys + labels, and persisting them in plaintext IndexedDB
 * would add a partner-metadata-at-rest leak beyond the accepted R-09 residual
 * (which is limited to message key names). Session-scoped recents keep the
 * feature without widening the at-rest surface. The hook {@link useRecentChats}
 * owns the per-account keying + capping.
 */
import { atom } from 'jotai';

/** Which kind of chat a recent entry points at (drives routing + the row icon). */
export type RecentChatKind = 'dm' | 'room' | 'group';

/** One recently-opened chat. */
export interface RecentChat {
  kind: RecentChatKind;
  /** Stable id: dm → peer pubkey; room → `ct_…` sale address; group → `ug_…` id. */
  id: string;
  /** Identicon seed — an æ address when known, else the id/pubkey. */
  seed: string;
  /** Primary label (chain name / `#symbol` / group name). */
  label: string;
  /** Secondary line (æ address / room label). */
  subtitle?: string;
  /** Route `symbol` param for room/group screens. */
  symbol?: string;
  /** Last-opened time (ms) — most-recent first. */
  at: number;
}

/** Max entries kept per account. */
export const MAX_RECENT_CHATS = 12;

/** Recent chats keyed by owner nostr pubkey → capped, most-recent-first list. */
export const recentChatsAtom = atom<Record<string, RecentChat[]>>({});
