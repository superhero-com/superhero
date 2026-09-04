/**
 * Core chat types — ported from `superhero-app/src/features/chat/core/types.ts`.
 *
 * Platform-neutral domain model shared by the DM plane (NIP-04). No React and no
 * storage-engine assumptions live here — the web build binds these types to an
 * IndexedDB adapter (see `../storage`), not AsyncStorage.
 */

// Message Types

export type MessageStatus =
  | { type: 'sending' }
  | { type: 'sent'; eventId: string }
  | { type: 'delivered'; at: number }
  | { type: 'read'; at: number }
  | { type: 'failed'; reason: string };

/** Base message interface. */
export interface Message {
  id: string;
  content: string;
  timestamp: number;
  createdAt: number; // Nostr event timestamp (ms)
  status: MessageStatus;
}

/** Direct message (one-to-one, NIP-04 encrypted on the wire). */
export interface DirectMessage extends Message {
  type: 'dm';
  fromPubkey: string;
  toPubkey: string;
  isFromMe: boolean;
  eventId?: string;
}

/** Union of all conversation message shapes (DM-only in v1). */
export type ConversationMessage = DirectMessage;

// Contact Types

/** User profile metadata (NIP-01 kind 0). */
export interface Profile {
  name?: string;
  about?: string;
  picture?: string;
  nip05?: string; // Verified identifier
  lud16?: string; // Lightning address
  banner?: string;
  website?: string;
  /**
   * æternity account address (`ak_…`) advertised by the user in their kind-0
   * metadata under the `ae_address` field. Optional — not all profiles carry it.
   */
  aeAddress?: string;
}

/** A Nostr user you can message. */
export interface Contact {
  pubkey: string;
  npub: string;
  nickname?: string; // Custom local nickname
  profile?: Profile;
  lastSeen?: number;
}

// Conversation Types

/** Direct message conversation. */
export interface DirectConversation {
  type: 'dm';
  contactPubkey: string;
  contact?: Contact;
  lastMessage?: DirectMessage;
  unreadCount: number;
  lastActivity: number;
}

/** Union of all conversation shapes (DM-only in v1). */
export type Conversation = DirectConversation;

// Relay Types

/** Relay configuration. */
export interface Relay {
  url: string;
  read: boolean;
  write: boolean;
  connected?: boolean;
  lastConnected?: number;
}

/** Relay dictionary for storage. */
export interface RelayDict {
  [url: string]: {
    read: boolean;
    write: boolean;
  };
}

// User/Keys Types

/**
 * The user's Nostr keys. Derived from the æternity wallet seed
 * (`m/44'/1237'/0'/0/<idx>`) — see `../nostr/crypto`. This object contains the
 * nostr SECRET key: in the web build it is cached in memory ONLY for the chat
 * session and never persisted (the chat-key exception / the custody condition set). It is not
 * the AE spending key and carries no mnemonic.
 */
export interface UserKeys {
  privateKey: string; // Hex format
  publicKey: string; // Hex format
  npub: string; // Bech32 encoded public key
  nsec: string; // Bech32 encoded private key
}

/** Chat service status. */
export interface ChatStatus {
  isConnected: boolean;
  isInitializing: boolean;
  keys: UserKeys | null;
  relays: RelayDict;
  connectedRelays: string[];
  error: string | null;
  lastActivity?: number;
}

// Storage Types

export interface StoredMessages {
  [conversationId: string]: ConversationMessage[];
}

export interface StoredContacts {
  [pubkey: string]: Contact;
}

export interface StoredProfiles {
  [pubkey: string]: Profile;
}

export interface StoredUnreadCounts {
  [conversationId: string]: number;
}

/** Chat manifest — tracks which conversations exist. */
export interface ChatManifest {
  [conversationId: string]: {
    type: 'dm';
    pubkey?: string; // For DMs
    lastActivity: number;
  };
}

// Nostr Protocol Types (at boundaries)

/** Raw Nostr event structure. */
export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

/** Nostr filter for queries. */
export interface NostrFilter {
  ids?: string[];
  authors?: string[];
  kinds?: number[];
  '#e'?: string[];
  '#p'?: string[];
  since?: number;
  until?: number;
  limit?: number;
}
