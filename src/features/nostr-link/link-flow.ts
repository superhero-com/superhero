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
import { ApiError } from '@/api/generated/core/ApiError';
import { OpenAPI } from '@/api/generated/core/OpenAPI';
import { signAndVerifyLinkMessage } from '@/utils/signLinkMessage';
import type { NostrIdentityProvider } from '@/features/chat/identity/nostr-identity';
import { clearNostrSubmission, readNostrSubmission, rememberNostrSubmission } from './storage';
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

// Optimistic confirmation is bounded, but an old accepted submission is still
// not proof that registration is missing. Keep it pending until the API confirms
// it, rather than starting another registration during a prolonged indexer lag.
function submittedLink(api: string, address: string): string | null {
  const submitted = readNostrSubmission(api, address);
  if (!submitted) return null;
  if (Date.now() - submitted.submittedAt >= 15 * 60_000) {
    throw new Error('Chat registration is still awaiting confirmation. Please retry the check.');
  }
  return submitted.npub;
}

/**
 * Check the backend first. A recently accepted submission bridges stale/missing
 * account records while the indexer catches up, including after a page reload.
 * Transport/server failures are unknown, never evidence of a missing link.
 */
export async function fetchNostrLink(address: string): Promise<string | null> {
  const api = OpenAPI.BASE;
  try {
    const account = (await AccountsService.getAccount({ address })) as {
      links?: Record<string, string> | null;
    } | null;
    if (!account || typeof account !== 'object') throw new Error('Invalid account response');
    const linked = account.links?.nostr;
    if (linked) {
      clearNostrSubmission(api, address);
      return linked;
    }
  } catch (error) {
    const submitted = submittedLink(api, address);
    if (submitted) return submitted;
    if (!(error instanceof ApiError && error.status === 404)) throw error;
  }
  return submittedLink(api, address);
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
  const api = OpenAPI.BASE;
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
  const result = (await NostrLinkService.nostrLinkControllerSubmit({
    requestBody: {
      address,
      value: npub,
      nonce: claim.nonce,
      signature,
      nostr_event: nostrEvent,
    },
  })) as { txHash?: string };
  if (result.txHash) rememberNostrSubmission(api, address, npub, result.txHash);
  return result;
}
