/**
 * Nostr identity Jotai state (condition 2).
 *
 * `userKeysAtom` is a plain in-memory `atom` — deliberately NOT `atomWithStorage`
 * the way the mobile app persists `CHAT_USER_KEYS` in AsyncStorage. The derived
 * nostr key is session-cached in memory ONLY; it must never reach localStorage,
 * sessionStorage or IndexedDB. A later stage feeds this atom from
 * `NostrKeySession` (unlock → set keys; lock → set null) inside the chat
 * provider, and reads it for reactive UI.
 */
import { atom } from 'jotai';
import type { UserKeys } from '../core/types';

/** The current session's derived nostr key. MEMORY ONLY — never persisted. */
export const userKeysAtom = atom<UserKeys | null>(null);

/** Whether a nostr identity is currently unlocked for this session. */
export const isNostrUnlockedAtom = atom((get) => get(userKeysAtom) !== null);

/** The current session's hex public key, or null when locked. */
export const currentUserPubkeyAtom = atom((get) => get(userKeysAtom)?.publicKey ?? null);
