/**
 * Direct message service — ported from
 * `superhero-app/src/features/chat/domains/direct-messages/dm.service.ts`.
 *
 * Custody: unlike the app service (which held a raw `UserKeys` and called
 * `encryptMessage(keys.privateKey, …)`), the web service signs and encrypts ONLY
 * through a revocable {@link NostrIdentityProvider}. Every path first awaits
 * `identity.getPublicKey()` / `nip04Encrypt`, so once `NostrKeySession.lock()`
 * fires the provider rejects and this service can no longer send or decode — the
 * transport-layer half of the "revocable on lock" precondition. There is a test
 * (`__tests__/revocable-identity.test.ts` companion) asserting a service obtained
 * BEFORE lock rejects AFTER lock.
 */
import type { DirectMessage, NostrEvent } from '../../core/types';
import type { NostrClient } from '../../nostr/nostr-client';
import type { NostrIdentityProvider } from '../../identity/nostr-identity';
import {
  eventToDirectMessage, generateMessageId, createOptimisticStatus, createSentStatus,
} from '../../utils/converters';
import { sanitizeMessageContent, isValidMessageContent } from '../../utils/validators';
import { appendMessage, loadMessages } from './dm.storage';

export class DirectMessageService {
  private client: NostrClient;

  private identity: NostrIdentityProvider;

  constructor(client: NostrClient, identity: NostrIdentityProvider) {
    this.client = client;
    this.identity = identity;
  }

  /** Encrypt (NIP-04), publish a kind-4 event, and persist the sent message. */
  async sendMessage(toPubkey: string, content: string): Promise<DirectMessage> {
    const sanitized = sanitizeMessageContent(content);
    if (!isValidMessageContent(sanitized)) {
      throw new Error('Message content is empty');
    }

    // `getPublicKey()` rejects once the session is locked — no stale key path.
    const myPubkey = await this.identity.getPublicKey();
    const optimistic: DirectMessage = {
      type: 'dm',
      id: generateMessageId(),
      content: sanitized,
      fromPubkey: myPubkey,
      toPubkey,
      isFromMe: true,
      timestamp: Date.now(),
      createdAt: Date.now(),
      status: createOptimisticStatus(),
    };

    try {
      const encrypted = await this.identity.nip04Encrypt(toPubkey, sanitized);
      const eventId = await this.client.publishEvent({
        kind: 4,
        created_at: Math.floor(Date.now() / 1000),
        tags: [['p', toPubkey]],
        content: encrypted,
      });
      const sent: DirectMessage = { ...optimistic, eventId, status: createSentStatus(eventId) };
      await appendMessage(toPubkey, sent);
      return sent;
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown error';
      await appendMessage(toPubkey, { ...optimistic, status: { type: 'failed', reason } });
      throw error;
    }
  }

  /** De-dupe by event id, persist, and return the domain message for an inbound DM. */
  async processIncomingDM(
    event: NostrEvent,
    decrypted: string,
    otherPubkey: string,
  ): Promise<DirectMessage> {
    const myPubkey = await this.identity.getPublicKey();
    const message = eventToDirectMessage(event, decrypted, myPubkey);

    const existing = await loadMessages(otherPubkey);
    if (existing.some((m) => m.eventId === event.id)) {
      return message;
    }

    await appendMessage(otherPubkey, message);
    return message;
  }
}
