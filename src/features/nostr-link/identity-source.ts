/**
 * Default nostr-identity source for the link flow.
 *
 * The link needs two things from the user's nostr identity: the public `npub`
 * (to claim) and a `NostrIdentityProvider` (to sign the kind-22242 proof). Both
 * come from the seed, so this performs the one-time, nostr-only vault unlock
 * that Stage 1 built (`deriveNostrIdentity`) and wraps the result in the derived
 * provider. The raw `UserKeys` is read ONLY for its public `npub` and handed
 * straight into the provider factory, which captures the secret in its closure —
 * this module never signs with, stores, or returns the raw key.
 *
 * This is the inline-wallet path (the only surface that holds the seed). An
 * extension / WalletConnect account has no seed on this origin, so `load()`
 * returns null and the caller surfaces an error — the AE signature works for
 * both wallets, but a derived nostr identity does not. `NostrLinkGate` passes
 * this as the default; a later stage that owns a live chat session can inject
 * its own source instead.
 */
import { createIndexedDbVaultStore } from '@/features/wallet/vault-store';
import { deriveNostrIdentity } from '@/features/wallet/nostr-key';
import { requestUnlock } from '@/features/wallet/unlock-broker';
import { indexForAddress } from '@/features/wallet/manifest-store';
import { createDerivedNostrIdentity } from '@/features/chat/identity/derived-identity';
import type { NostrIdentityProvider } from '@/features/chat/identity/nostr-identity';

export interface LinkNostrIdentity {
  npub: string;
  identity: NostrIdentityProvider;
}

/** Resolver the link flow calls when the user chooses to link. */
export type DeriveLinkIdentity = (address: string) => Promise<LinkNostrIdentity>;

export const deriveInlineLinkIdentity: DeriveLinkIdentity = async (address) => {
  const record = await createIndexedDbVaultStore().load();
  if (!record) {
    throw new Error('Chat linking needs the in-app wallet on this device.');
  }
  const accountIndex = indexForAddress(address) ?? 0;
  const keys = await deriveNostrIdentity(
    record,
    (r) => requestUnlock(r, { kind: 'nostr-link' }),
    accountIndex,
  );
  return { npub: keys.npub, identity: createDerivedNostrIdentity(keys) };
};
