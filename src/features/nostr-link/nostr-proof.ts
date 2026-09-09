import type { EventTemplate } from 'nostr-tools/pure';
import type { NostrIdentityProvider } from '@/features/chat/identity/nostr-identity';

/** Kind 22242: NIP-42 client auth, reused by the backend as proof-of-ownership. */
const NOSTR_LINK_PROOF_KIND = 22242;

/**
 * Create a signed Nostr proof event (kind 22242) whose `content` is the exact
 * link message returned by the claim endpoint. The backend verifies the event
 * signature, that `pubkey` matches the claimed npub, and that `created_at` is
 * fresh (<5 min) — so this must be built immediately before submission.
 *
 * The event is signed THROUGH the `NostrIdentityProvider` seam, never
 * with a raw secret key: the key stays captured inside the provider closure.
 */
export async function createNostrProofEvent(
  identity: NostrIdentityProvider,
  message: string,
): Promise<string> {
  const template: EventTemplate = {
    kind: NOSTR_LINK_PROOF_KIND,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: message,
  };

  const signedEvent = await identity.signEvent(template);
  return JSON.stringify(signedEvent);
}
