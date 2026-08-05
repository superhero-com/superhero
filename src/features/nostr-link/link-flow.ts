/**
 * The AE↔Nostr link protocol, as a pure (React-free) orchestration so it can be
 * unit- and integration-tested without a wallet UI. The React surface
 * (`useNostrLinkCheck`) is a thin wrapper over these functions.
 *
 * Bindings, per the Stage 2 brief:
 *  - claim / submit go through the generated `NostrLinkService` (never a
 *    hand-rolled fetch client);
 *  - the AE message signature goes through the repo's existing signing seam
 *    (`signAndVerifyLinkMessage` → the wallet's `signMessage`), which already
 *    works for both the inline wallet and the extension / WalletConnect wallet;
 *  - the kind-22242 proof is signed through the `NostrIdentityProvider` seam
 *    (`createNostrProofEvent`), never a raw nostr secret key.
 */
import { AccountsService, NostrLinkService } from '@/api/generated';
import { signAndVerifyLinkMessage } from '@/utils/signLinkMessage';
import type { NostrIdentityProvider } from '@/features/chat/identity/nostr-identity';
import { createNostrProofEvent } from './nostr-proof';

/** The wallet signed-message channel (`useAeSdk().signMessage`). */
export type SignMessageFn = (
  message: string,
  options?: Record<string, unknown>,
) => Promise<string>;

/** The `/api/address-links/nostr/claim` response. */
export interface NostrClaimResult {
  message: string;
  nonce: number;
  value: string;
}

export interface LinkNostrParams {
  /** The æternity account (`ak_…`) doing the linking. */
  address: string;
  /** The bech32 npub being linked to `address`. */
  npub: string;
  /** Nostr signing seam for the kind-22242 proof. */
  identity: NostrIdentityProvider;
  /** Wallet signed-message channel for the AE signature. */
  signMessage: SignMessageFn;
}

/**
 * Read the nostr link currently registered for `address`, or null if none.
 * A missing account (404) is treated as "not linked", matching the app.
 */
export async function fetchNostrLink(address: string): Promise<string | null> {
  try {
    const account = (await AccountsService.getAccount({ address })) as {
      links?: Record<string, string> | null;
    } | null;
    return account?.links?.nostr ?? null;
  } catch {
    return null;
  }
}

/**
 * Run the full claim → AE-sign → nostr-proof → submit round-trip. Resolves when
 * the backend has accepted and relayed the on-chain link; throws with the
 * backend's message on any failure.
 */
export async function linkNostrIdentity({
  address,
  npub,
  identity,
  signMessage,
}: LinkNostrParams): Promise<{ txHash?: string }> {
  // 1. Claim — get the challenge message + on-chain nonce.
  const claim = (await NostrLinkService.nostrLinkControllerClaim({
    requestBody: { address, value: npub },
  })) as NostrClaimResult;

  // 2. AE signature — sign the standard signed-message digest (hashMessage),
  //    verified locally against `address` before it leaves the client. This is
  //    the exact digest the contract's `verify_user_sig` checks.
  const signature = await signAndVerifyLinkMessage(address, signMessage, claim.message);

  // 3. Nostr proof — kind-22242 event whose content is the claim message, signed
  //    through the identity seam. Built last so `created_at` is freshest.
  const nostrEvent = await createNostrProofEvent(identity, claim.message);

  // 4. Submit.
  return (await NostrLinkService.nostrLinkControllerSubmit({
    requestBody: {
      address,
      value: npub,
      nonce: claim.nonce,
      signature,
      nostr_event: nostrEvent,
    },
  })) as { txHash?: string };
}
