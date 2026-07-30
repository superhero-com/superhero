import { AccountMnemonicFactory } from '@aeternity/aepp-sdk';

/** The public result of deriving one account from a mnemonic. No secret material. */
export interface DerivedAccount {
  address: string;
}

/**
 * Derive account `index` from a BIP39 mnemonic, using the SDK's own factory.
 *
 * This is the ONLY derivation path for the inline wallet — never reimplement
 * BIP32/SLIP-10 key derivation by hand. `AccountMnemonicFactory` is the exact
 * same factory the Superhero extension / native wallet use
 * (`m/44'/457'/{index}'/0'/0'`, SLIP-0010 ed25519), so calling it here
 * guarantees the inline signer derives byte-identical addresses to a user's
 * existing wallet for the same mnemonic + index. See
 * `__tests__/derivation.goldenvector.test.ts` and
 * the wallet build plan §5.1/§6.6 — a divergent
 * derivation path means a user sees the wrong address for their seed, which
 * reads as lost funds.
 *
 * This function does not persist the mnemonic or the derived key anywhere;
 * it only reads out the public address for the given index.
 */
export function deriveAccount(mnemonic: string, index: number): DerivedAccount {
  const account = new AccountMnemonicFactory(mnemonic).initializeSync(index);
  return { address: account.address };
}
