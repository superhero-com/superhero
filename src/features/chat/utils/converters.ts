/**
 * Data conversion utilities — ported from
 * `superhero-app/src/features/chat/utils/converters.ts`.
 *
 * Pure functions converting between Nostr wire formats and the domain model.
 * (The app's `console.error` diagnostics are dropped for the web build's
 * no-console lint rule; the fallbacks are unchanged.)
 */
import * as nip19 from 'nostr-tools/nip19';
import type {
  NostrEvent, DirectMessage, Profile, MessageStatus,
} from '../core/types';

/** Convert npub to hex pubkey. */
export function npubToHex(npub: string): string {
  const decoded = nip19.decode(npub);
  if (decoded.type !== 'npub') {
    throw new Error('Invalid npub format');
  }
  return decoded.data as string;
}

/** Convert hex pubkey to npub (falls back to the input on failure). */
export function hexToNpub(pubkey: string): string {
  try {
    return nip19.npubEncode(pubkey);
  } catch {
    return pubkey;
  }
}

/** Convert nsec to hex private key. */
export function nsecToHex(nsec: string): string {
  const decoded = nip19.decode(nsec);
  if (decoded.type !== 'nsec') {
    throw new Error('Invalid nsec format');
  }
  const data = decoded.data as Uint8Array;
  return Array.from(data, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Normalize a Nostr identifier (npub or hex) to both formats. */
export function normalizeNostrId(identifier: string): { pubkey: string; npub: string } {
  if (/^[0-9a-f]{64}$/i.test(identifier)) {
    return { pubkey: identifier, npub: hexToNpub(identifier) };
  }
  try {
    const decoded = nip19.decode(identifier);
    if (decoded.type === 'npub') {
      const pubkey = decoded.data as string;
      return { pubkey, npub: identifier };
    }
  } catch {
    // fall through to the shared error below
  }
  throw new Error('Invalid Nostr identifier');
}

/** Convert a Nostr event + decrypted content to a DirectMessage. */
export function eventToDirectMessage(
  event: NostrEvent,
  decryptedContent: string,
  currentUserPubkey: string,
): DirectMessage {
  const isFromMe = event.pubkey === currentUserPubkey;
  const otherPubkey = isFromMe
    ? event.tags.find((t) => t[0] === 'p')?.[1] || ''
    : event.pubkey;

  return {
    type: 'dm',
    id: `msg_${event.id}`,
    eventId: event.id,
    content: decryptedContent,
    fromPubkey: event.pubkey,
    toPubkey: otherPubkey,
    isFromMe,
    timestamp: Date.now(),
    createdAt: event.created_at * 1000,
    status: isFromMe
      ? { type: 'sent', eventId: event.id }
      : { type: 'delivered', at: event.created_at * 1000 },
  };
}

/** Convert a Nostr metadata (kind-0) event to a Profile. */
export function eventToProfile(event: NostrEvent): Profile {
  try {
    const parsed = JSON.parse(event.content);
    return {
      name: parsed.name,
      about: parsed.about,
      picture: parsed.picture,
      nip05: parsed.nip05,
      lud16: parsed.lud16,
      banner: parsed.banner,
      website: parsed.website,
      // `ae_address` (snake_case per Nostr metadata convention) → camelCase.
      aeAddress: parsed.ae_address,
    };
  } catch {
    return {};
  }
}

/** Extract pubkey mentions from Nostr event tags. */
export function extractPubkeyMentions(tags: string[][]): string[] {
  return tags
    .filter((tag) => tag[0] === 'p')
    .map((tag) => tag[1])
    .filter(Boolean);
}

/** Generate a unique message ID. */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/** Generate the conversation ID for a DM. */
export function getDMConversationId(pubkey: string): string {
  return `dm_${pubkey}`;
}

/** Parse a conversation ID to determine its type. */
export function parseConversationId(conversationId: string): { type: 'dm'; id: string } {
  if (conversationId.startsWith('dm_')) {
    return { type: 'dm', id: conversationId.slice(3) };
  }
  throw new Error('Invalid conversation ID format');
}

/** Optimistic (pre-relay) message status. */
export function createOptimisticStatus(): MessageStatus {
  return { type: 'sending' };
}

/** Sent (relay-accepted) message status. */
export function createSentStatus(eventId: string): MessageStatus {
  return { type: 'sent', eventId };
}

/** Failed message status. */
export function createFailedStatus(reason: string): MessageStatus {
  return { type: 'failed', reason };
}
