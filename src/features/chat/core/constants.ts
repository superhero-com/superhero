/**
 * Core chat constants — ported from
 * `superhero-app/src/features/chat/core/constants.ts`.
 *
 * Web-neutral. The mobile file's Expo-only `GATED_ROOM_RELAY` (which reads
 * `process.env.EXPO_PUBLIC_*`) is intentionally dropped — token-gated rooms are
 * out of scope for the PWA v1, and the constant was already a
 * deprecated non-load-bearing fallback there.
 */

/** Nostr event kinds (NIP-01 and others). */
export const NostrKind = {
  Metadata: 0, // User metadata
  Text: 1, // Text note
  RecommendRelay: 2, // Recommend relay
  Contacts: 3, // Contact list
  EncryptedDirectMessage: 4, // Encrypted DM (NIP-04)
  EventDeletion: 5, // Event deletion
  Repost: 6, // Repost/quote
  Reaction: 7, // Reaction/like
  // NIP-29 relay-based groups (token-gated communities) — out of PWA v1 scope,
  // kept as constants only so the shared enum matches the app 1:1.
  GroupChatMessage: 9,
  GroupThreadRoot: 11,
  GroupAddUser: 9000,
  GroupRemoveUser: 9001,
  GroupEditMetadata: 9002,
  GroupSetRoles: 9006,
  GroupCreate: 9007,
  GroupDelete: 9008,
  GroupCreateInvite: 9009,
  GroupJoinRequest: 9021,
  GroupLeaveRequest: 9022,
  ClientAuth: 22242, // NIP-42 AUTH response
  GroupMetadata: 39000,
  GroupAdmins: 39001,
  GroupMembers: 39002,
  GroupRoles: 39003,
} as const;

/**
 * Logical storage keys for the chat KV layer. In the web build these name
 * records in the IndexedDB adapter (see `../storage`), replacing the app's
 * AsyncStorage keys — the string values are kept identical so the ported
 * `*.storage.ts` services (stages 3–4) need no key edits.
 */
export const StorageKeys = {
  USER_KEYS: 'CHAT_USER_KEYS',
  MESSAGES_PREFIX: 'CHAT_MESSAGES',
  CONTACTS: 'CHAT_CONTACTS',
  PROFILES: 'CHAT_PROFILES',
  RELAYS: 'CHAT_RELAYS',
  UNREAD_COUNTS: 'CHAT_UNREAD_COUNTS',
  CHAT_MANIFEST: 'CHAT_MANIFEST',
  READ_RECEIPTS_PREFIX: 'CHAT_READ_RECEIPTS',
  RECENTS: 'CHAT_RECENTS',
} as const;

/**
 * Default relay configuration.
 *
 * NOTE (stage 3+): the app ships a plaintext `ws://` relay. A PWA served over
 * `https://` cannot open an insecure `ws://` socket (mixed-content), so the web
 * relay set must be `wss://` before chat transport lands. Kept here as the
 * app-parity default only.
 */
export const DEFAULT_RELAYS = {
  'ws://136.243.173.251:8080': { read: true, write: true },
} as const;

/** Timing constants. */
export const Timing = {
  EVENT_QUEUE_DEBOUNCE_MS: 50,
  PERIODIC_FETCH_INTERVAL_MS: 10000, // 10 seconds
  INITIAL_FETCH_DELAY_MS: 500,
  RELAY_CONNECTION_TIMEOUT_MS: 5000,
  ONLINE_STATUS_TIMEOUT_MS: 5 * 60 * 1000, // 5 minutes
} as const;

/**
 * BIP-32 derivation path for Nostr keys from the wallet seed. Coin type 1237 is
 * the registered Nostr type; `accountIndex` matches the active AE account's
 * index so a user's web and mobile npub are identical.
 */
export function getNostrDerivationPath(accountIndex: number): string {
  return `m/44'/1237'/0'/0/${accountIndex}`;
}
