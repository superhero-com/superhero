/**
 * Location sharing service for the Superhero chat feature.
 *
 * Implements the private area-sharing protocol described in
 * "Nostr + S2 Private Area Sharing and Mobile Notification Spec v0.3":
 *
 * - Users share a coarse S2 grid cell token (NOT raw GPS coordinates).
 * - Area cards are NIP-44 encrypted and sent as Nostr kind:24133 events.
 * - Proximity is detected on-device by comparing cell tokens (cellsOverlap).
 * - No server ever sees GPS data.
 *
 * This service is separate from the main DM/room chat infrastructure and
 * deliberately has no shared state with it — it only needs the wallet's
 * Nostr keypair (privKeyHex / pubKeyHex) and the Nostr relay pool.
 *
 * Integration note for feat/nostr-chat:
 * The nostr-client.ts in this feature already exports `pool` and NIP-44
 * encrypt/decrypt helpers. This file imports from there so we don't
 * duplicate the relay connection logic.
 */

import { finalizeEvent, SimplePool, nip44 } from 'nostr-tools';
import type { Filter } from 'nostr-tools';
import type { LocationLevel } from './s2';

/** Nostr kind used for area-share cards (ephemeral, not stored by relays). */
const KIND_AREA_CARD = 24133;

const RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.nostr.band',
  'wss://nos.lol',
];

// Module-level pool for location events (separate from the chat pool to
// avoid interference with relay lifecycle managed by NostrClient).
const locationPool = new SimplePool();

async function encryptForRecipient(privKeyHex: string, recipientPubHex: string, text: string): Promise<string> {
  const privBytes = hexToBytes(privKeyHex);
  const convKey = nip44.getConversationKey(privBytes, recipientPubHex);
  return nip44.encrypt(text, convKey);
}

async function decryptFromSender(privKeyHex: string, senderPubHex: string, ciphertext: string): Promise<string> {
  const privBytes = hexToBytes(privKeyHex);
  const convKey = nip44.getConversationKey(privBytes, senderPubHex);
  return nip44.decrypt(ciphertext, convKey);
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AreaCardPayload {
  /** S2-style cell token (e.g. "L5:13:3") */
  s2Token: string;
  /** Grid precision level */
  level: LocationLevel;
  /** Human-readable area label (e.g. "Lisbon") */
  areaLabel: string;
  /** Sharing status: 'sharing' | 'away' | 'stopped' */
  status: 'sharing' | 'away' | 'stopped';
  /** Unix timestamp when this card expires */
  validUntil: number;
}

export interface FriendArea extends AreaCardPayload {
  /** The Nostr pubkey (hex) of the contact sharing their area */
  pubKeyHex: string;
  /** True when this friend's cell overlaps the current user's cell */
  overlap: boolean;
}

// ── Send area card ─────────────────────────────────────────────────────────────

/**
 * Broadcast an area card to all provided contacts.
 * Each card is individually NIP-44 encrypted for the recipient.
 * Failures for individual contacts are swallowed so a single bad key
 * doesn't block the whole broadcast.
 */
export async function broadcastAreaCard(
  privKeyHex: string,
  contactPubKeyHexes: string[],
  payload: AreaCardPayload,
): Promise<void> {
  const body = JSON.stringify({
    type: 'area_share',
    grid: {
      system: 's2',
      ladder: payload.level,
      s2_token: payload.s2Token,
    },
    area_label: payload.areaLabel,
    status: payload.status,
    valid_until: payload.validUntil,
  });

  const privBytes = hexToBytes(privKeyHex);

  await Promise.allSettled(
    contactPubKeyHexes.map(async (recipientPubHex) => {
      const encrypted = await encryptForRecipient(privKeyHex, recipientPubHex, body);
      const event = finalizeEvent(
        {
          kind: KIND_AREA_CARD,
          created_at: Math.floor(Date.now() / 1000),
          tags: [['p', recipientPubHex]],
          content: encrypted,
        },
        privBytes,
      );
      await Promise.allSettled(locationPool.publish(RELAYS, event));
    }),
  );
}

// ── Subscribe to incoming area cards ──────────────────────────────────────────

/**
 * Subscribe to area cards sent to this user.
 * Returns a cleanup function that closes the subscription.
 */
export function subscribeAreaCards(
  pubKeyHex: string,
  privKeyHex: string,
  onArea: (area: Omit<FriendArea, 'overlap'>) => void,
): { close: () => void } {
  const filter: Filter = {
    kinds: [KIND_AREA_CARD],
    '#p': [pubKeyHex],
    // Only look back 2 hours — area cards are ephemeral
    since: Math.floor(Date.now() / 1000) - 60 * 60 * 2,
  };

  const sub = locationPool.subscribeMany(
    RELAYS,
    filter as any,
    {
      onevent: async (event) => {
        try {
          const decrypted = await decryptFromSender(privKeyHex, event.pubkey, event.content);
          const data = JSON.parse(decrypted);
          if (data.type !== 'area_share') return;

          const grid = data.grid as { s2_token: string; ladder: number } | undefined;
          if (!grid) return;

          onArea({
            pubKeyHex: event.pubkey,
            s2Token: grid.s2_token,
            level: grid.ladder as LocationLevel,
            areaLabel: (data.area_label as string) || 'Unknown',
            status: (data.status as 'sharing' | 'away' | 'stopped') || 'sharing',
            validUntil: (data.valid_until as number) || Math.floor(Date.now() / 1000) + 3600,
          });
        } catch {
          // Ignore decrypt/parse failures (wrong key, malformed)
        }
      },
    },
  );

  return sub;
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return arr;
}
