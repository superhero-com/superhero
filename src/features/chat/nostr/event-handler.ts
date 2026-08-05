/**
 * Nostr event handler — ported from
 * `superhero-app/src/features/chat/nostr/event-handler.ts`.
 *
 * Debounced, de-duplicated event queue that dispatches to typed callbacks.
 * Verbose `console.*` diagnostics are removed for the web build's no-console
 * rule; the debounce, dedup and dispatch behaviour are unchanged.
 */
import type { NostrEvent, UserKeys, Profile } from '../core/types';
import { NostrKind, Timing } from '../core/constants';
import { decryptMessage } from './crypto';
import { eventToProfile } from '../utils/converters';

export type EventHandlerCallbacks = {
  onDirectMessage: (event: NostrEvent, decrypted: string, otherPubkey: string) => void;
  onProfile: (pubkey: string, profile: Profile) => void;
  onReaction: (event: NostrEvent) => void;
  onEventDeleted: (event: NostrEvent) => void;
};

export class NostrEventHandler {
  private keys: UserKeys;

  private callbacks: EventHandlerCallbacks;

  private eventQueue: NostrEvent[] = [];

  private eventQueueBuffer: NostrEvent[] = [];

  private isProcessing = false;

  private queueTimer: ReturnType<typeof setTimeout> | null = null;

  private seenEvents: Set<string> = new Set();

  constructor(keys: UserKeys, callbacks: EventHandlerCallbacks) {
    this.keys = keys;
    this.callbacks = callbacks;
  }

  /** Replace the identity keys used for DM decryption. */
  updateKeys(keys: UserKeys): void {
    this.keys = keys;
  }

  /** Queue an event for debounced processing, de-duplicated by event id. */
  queueEvent(event: NostrEvent): void {
    if (this.seenEvents.has(event.id)) {
      return;
    }
    this.seenEvents.add(event.id);

    if (this.isProcessing) {
      this.eventQueueBuffer.push(event);
      return;
    }

    if (this.eventQueueBuffer.length > 0) {
      this.eventQueue.push(...this.eventQueueBuffer);
      this.eventQueueBuffer = [];
    }
    if (this.queueTimer) {
      clearTimeout(this.queueTimer);
    }
    this.eventQueue.push(event);
    this.queueTimer = setTimeout(() => {
      this.processQueue();
    }, Timing.EVENT_QUEUE_DEBOUNCE_MS);
  }

  /** Drain the queue in order (serial — DM ordering matters). */
  private async processQueue(): Promise<void> {
    this.isProcessing = true;
    const queued = this.eventQueue;
    this.eventQueue = [];
    // Serial reduce keeps ordering without tripping no-await-in-loop.
    await queued.reduce(
      (prev, event) => prev.then(() => this.processEvent(event)),
      Promise.resolve(),
    );
    this.isProcessing = false;
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
    const isFromMe = event.pubkey === this.keys.publicKey;
    const otherPubkey = isFromMe
      ? event.tags.find((t) => t[0] === 'p')?.[1]
      : event.pubkey;

    if (!otherPubkey) {
      return;
    }

    const decrypted = await decryptMessage(this.keys.privateKey, otherPubkey, event.content);
    this.callbacks.onDirectMessage(event, decrypted, otherPubkey);
  }

  /** Clear the de-duplication cache (memory management). */
  clearCache(): void {
    this.seenEvents.clear();
  }
}
