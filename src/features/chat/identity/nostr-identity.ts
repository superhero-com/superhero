/**
 * NostrIdentityProvider — the single seam every chat surface signs and
 * encrypts through.
 *
 * The method set is deliberately the NIP-07 `window.nostr` shape
 * (`getPublicKey` / `signEvent` / `nip04Encrypt` / `nip04Decrypt`) so that if a
 * browser Nostr extension is ever wanted it becomes a SECOND implementation of
 * this interface, not a rewrite of the callers. For PWA v1 there is exactly one
 * implementation: `createDerivedNostrIdentity` (see `./derived-identity`), built
 * from the seed-derived, session-cached nostr key. NIP-07 is deferred (§5).
 *
 * Callers (stages 3–4) MUST depend on this interface and never touch a raw
 * `UserKeys.privateKey`: the raw key is captured inside the provider closure and
 * never handed back, which is the structural half of the key-custody rule.
 */
import type { EventTemplate } from 'nostr-tools/pure';
import type { NostrEvent } from '../core/types';

export interface NostrIdentityProvider {
  /** The user's hex public key. */
  getPublicKey(): Promise<string>;
  /** Finalize (sign) an unsigned event template into a signed Nostr event. */
  signEvent(template: EventTemplate): Promise<NostrEvent>;
  /** NIP-04 encrypt `plaintext` to `recipientPubkey` (hex). */
  nip04Encrypt(recipientPubkey: string, plaintext: string): Promise<string>;
  /** NIP-04 decrypt `ciphertext` from `senderPubkey` (hex). */
  nip04Decrypt(senderPubkey: string, ciphertext: string): Promise<string>;
}
