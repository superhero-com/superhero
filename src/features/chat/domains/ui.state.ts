/**
 * Chat UI Jotai state — ported from
 * `superhero-app/src/features/chat/domains/ui.state.ts`.
 *
 * The app's persisted `userKeysAtom` is intentionally NOT reproduced here — the
 * web build's session key lives in `../identity/nostr.state` (memory-only, never
 * persisted). This module holds the transport/sync UI atoms only. Relays are an
 * in-memory atom seeded from `DEFAULT_RELAYS` (all `wss://`).
 */
import { atom } from 'jotai';
import type { ChatStatus, RelayDict } from '../core/types';
import { DEFAULT_RELAYS } from '../core/constants';

/** Active relay config (in-memory; defaults to the wss:// set). */
export const relaysAtom = atom<RelayDict>({ ...DEFAULT_RELAYS });

/** Transport status. */
export const chatStatusAtom = atom<ChatStatus>({
  isConnected: false,
  isInitializing: false,
  keys: null,
  relays: { ...DEFAULT_RELAYS },
  connectedRelays: [],
  error: null,
});

/** Relay URLs that have emitted events this session. */
export const connectedRelaysAtom = atom<string[]>([]);

/**
 * The conversation currently open (suppresses its unread increment). Initialised
 * through a typed local rather than a bare `null` literal: with the repo's
 * `strictNullChecks` off, `atom(null)` resolves to jotai's read-only overload,
 * which breaks `useSetAtom`. A `string | null`-typed seed selects the writable
 * primitive overload.
 */
const NO_ACTIVE_CONVERSATION: string | null = null;
export const activeConversationIdAtom = atom(NO_ACTIVE_CONVERSATION);

/** Own events fetched. */
export const isSyncReadyAtom = atom<boolean>(false);

/** Incoming DMs fetched. */
export const isSyncDoneAtom = atom<boolean>(false);
