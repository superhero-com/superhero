/**
 * nostr-key.ts — the ONLY bridge from the encrypted vault to a nostr identity
 * (§4, the chat-key exception).
 *
 * `deriveNostrIdentity` is the single-purpose, nostr-only unlock primitive the
 * custody decision requires (condition 5: no general "unlock once" primitive).
 * It:
 *   1. runs the caller's `UnlockProvider` — the SAME user-verification path the
 *      inline signer uses (passphrase / passkey), here WITHOUT a signing context
 *      because this is a non-signing unlock performed once at chat entry;
 *   2. unwraps the DEK and unseals the mnemonic TRANSIENTLY inside this scope;
 *   3. derives the BIP-39 seed and, from it, the secp256k1 nostr key at
 *      `m/44'/1237'/0'/0/<index>`;
 *   4. returns ONLY the nostr `UserKeys` and drops every seed reference.
 *
 * It NEVER returns the mnemonic, the seed, the DEK, or the AE spending key — the
 * return type is nostr-only and that is the structural half of custody
 * condition 1. Living in the wallet feature (not chat) keeps the transient
 * mnemonic behind the same boundary as the signer. This is a SECOND, independent
 * derivation path from `derivation.ts` (SLIP-0010 ed25519, the AE path) — it must
 * not be routed through `AccountMnemonicFactory` and must not change the AE path.
 *
 * Custody caveat (R-05, unchanged from the signer): a JS `string` mnemonic and a
 * `Uint8Array` seed cannot be truly zeroed; the guarantee is that nothing
 * survives this scope, plus a best-effort `fill(0)` of the seed bytes.
 */
import { mnemonicToSeedSync } from '@scure/bip39';
import { deriveKeysFromSeed } from '@/features/chat/nostr/crypto';
import type { UserKeys } from '@/features/chat/core/types';
import { unlockVault, type VaultRecord } from './vault-record';
import type { UnlockProvider } from './inline-signer';

/**
 * Verify the user (via `unlock`) and derive their nostr identity for
 * `accountIndex`. Returns nostr key material only. The caller (the chat session)
 * caches the result in memory for the session and must never persist it.
 */
export async function deriveNostrIdentity(
  record: VaultRecord,
  unlock: UnlockProvider,
  accountIndex: number,
): Promise<UserKeys> {
  // USER VERIFICATION at chat entry. Passed no context of its own: the caller
  // binds the one that names the grant ('chat-session' / 'nostr-link'). Nothing
  // is signed here, so there is no WYSIWYS payload to show.
  const { factorId, kek } = await unlock(record);
  let mnemonic: string | undefined;
  let seed: Uint8Array | undefined;
  try {
    ({ mnemonic } = await unlockVault(record, factorId, kek));
    seed = mnemonicToSeedSync(mnemonic);
    return deriveKeysFromSeed(seed, accountIndex);
  } finally {
    if (seed) seed.fill(0); // best-effort: drop the seed bytes (R-05 caveat)
    seed = undefined;
    mnemonic = undefined; // drop the decrypted-seed reference
  }
}
