/**
 * Nostr event handler — ported from
 * `superhero-app/src/features/chat/nostr/event-handler.ts`.
 *
 * Debounced, de-duplicated event queue that dispatches to typed callbacks.
 * Verbose `console.*` diagnostics are removed for the web build's no-console
 * rule; the debounce, dedup and dispatch behaviour are unchanged.
 */
import type { NostrEvent, Profile } from '../core/types';
import { NostrKind, Timing } from '../core/constants';
import { eventToProfile } from '../utils/converters';
import type { NostrIdentityProvider } from '../identity/nostr-identity';

export type EventHandlerCallbacks = {
  onDirectMessage: (event: NostrEvent, decrypted: string, otherPubkey: string) => void | Promise<void>;
  onProfile: (pubkey: string, profile: Profile) => void;
  onReaction: (event: NostrEvent) => void;
  onEventDeleted: (event: NostrEvent) => void;
};

export class NostrEventHandler {
  private identity: NostrIdentityProvider;

  private callbacks: EventHandlerCallbacks;

  private eventQueue: NostrEvent[] = [];

  private isProcessing = false;

  private queueTimer: ReturnType<typeof setTimeout> | null = null;

  private seenEvents: Set<string> = new Set();

  constructor(identity: NostrIdentityProvider, callbacks: EventHandlerCallbacks) {
    this.identity = identity;
    this.callbacks = callbacks;
  }

  /** Queue an event for debounced processing, de-duplicated by event id. */
  queueEvent(event: NostrEvent): void {
    if (this.seenEvents.has(event.id)) {
      return;
    }
    this.seenEvents.add(event.id);

    this.eventQueue.push(event);
    if (this.isProcessing) return;
    if (this.queueTimer) {
      clearTimeout(this.queueTimer);
    }
    this.queueTimer = setTimeout(() => {
      this.processQueue();
    }, Timing.EVENT_QUEUE_DEBOUNCE_MS);
  }

  /** Drain the queue in order (serial — DM ordering matters). */
  private async processQueue(): Promise<void> {
    this.isProcessing = true;
    this.queueTimer = null;
    try {
      while (this.eventQueue.length) {
        const event = this.eventQueue.shift()!;
        try {
          // Serial processing preserves order, including arrivals during decryption.
          // eslint-disable-next-line no-await-in-loop
          await this.processEvent(event);
        } catch {
          // One malformed ciphertext or a locked identity must not wedge the queue.
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async processEvent(event: NostrEvent): Promise<void> {
    switch (event.kind) {
      case NostrKind.Metadata:
        this.handleMetadata(event);
        break;
      case NostrKind.EncryptedDirectMessage:
        await this.handleDirectMessage(event);
        break;
      case NostrKind.EventDeletion:
        this.callbacks.onEventDeleted(event);
        break;
      case NostrKind.Reaction:
        this.callbacks.onReaction(event);
        break;
      default:
        break;
    }
  }

  /** Decode a kind-0 event through the shared decoder and dispatch. */
  private handleMetadata(event: NostrEvent): void {
    this.callbacks.onProfile(event.pubkey, eventToProfile(event));
  }

  /** Decrypt a kind-4 DM and dispatch. */
  private async handleDirectMessage(event: NostrEvent): Promise<void> {
    const myPubkey = await this.identity.getPublicKey();
    const isFromMe = event.pubkey === myPubkey;
    if (!isFromMe && !event.tags.some(([tag, value]) => tag === 'p' && value === myPubkey)) return;
    const otherPubkey = isFromMe
      ? event.tags.find((t) => t[0] === 'p')?.[1]
      : event.pubkey;

    if (!otherPubkey) {
      return;
    }

    const decrypted = await this.identity.nip04Decrypt(otherPubkey, event.content);
    await this.callbacks.onDirectMessage(event, decrypted, otherPubkey);
  }

  /** Clear the de-duplication cache (memory management). */
  clearCache(): void {
    this.seenEvents.clear();
  }
}
