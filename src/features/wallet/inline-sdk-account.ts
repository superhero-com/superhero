/**
 * inline-sdk-account.ts — the SDK-facing account adapter for the inline wallet.
 *
 * This is the P4-integration bridge between the tested signing core
 * (`InlineWalletSigner`, see `inline-signer.ts`) and the æternity SDK's
 * `staticAeSdk.addAccount(...)` install point in `AeSdkProvider.tsx`. It exposes
 * exactly the surface the existing delegated account exposes
 * (`createDelegatedSignerAccount` — `address` + `signTransaction` + `signMessage`)
 * so it is a structural drop-in the SDK accepts without an `instanceof` check.
 *
 * What it adds over `InlineWalletSigner`:
 *  - loads the encrypted `VaultRecord` from the device (`VaultStore`) — the SDK
 *    installs accounts synchronously with only an address, but the inline signer
 *    needs the vault; so the load happens lazily, inside each sign call;
 *  - the vault is (re)loaded on EVERY signature, so a later factor add/remove is
 *    always reflected and no decrypted state is ever held between calls.
 *
 * It changes NOTHING about the custody guarantees: user-verification + unseal
 * happen inside `InlineWalletSigner` on every signature (no cached seed —
 * the custody decision / the threat model R-02). The `unlock` provider passed in is where the
 * per-signature UV + WYSIWYS confirm UI lives; this adapter stays UI-agnostic
 * and unit-testable.
 *
 * GATED: nothing installs this yet. `AeSdkProvider.makeSigner` still returns the
 * throwing `EncryptedHdAccount` stub while `INLINE_WALLET_ENABLED === false`.
 * Wiring this in (+ the unlock/confirm modal) is the next increment and is
 * gated on the P0 security prerequisites + SR review.
 */
import { type Encoded } from '@aeternity/aepp-sdk';
import { createInlineWalletSigner, type UnlockProvider } from './inline-signer';
import type { VaultStore } from './vault-store';

interface SignOptions { networkId?: string; innerTx?: boolean; [k: string]: unknown }

export interface InlineSdkAccountOpts {
  /** the active account's public address (cleartext manifest data). */
  address: string;
  /** the account index to derive under the vault's mnemonic. */
  index: number;
  /** device vault store the encrypted record is loaded from, per signature. */
  store: VaultStore;
  /** user-verification + KEK provider; runs on every signature (the UI hook). */
  unlock: UnlockProvider;
  /** default network id for signing; a per-call option overrides it. */
  networkId?: string;
}

/**
 * Structural `AccountBase`-shaped account the SDK's `addAccount()` accepts —
 * mirrors `createDelegatedSignerAccount`'s live surface (address +
 * signTransaction + signMessage), plus the rest of the `AccountBase` sign
 * surface as loud, labelled throwers.
 *
 * The SDK's `addAccount` does no shape validation and calls account methods by
 * direct passthrough. The app's flows only ever call signTransaction /
 * signMessage today (same as the delegated account), but a future SDK entrypoint
 * (JWT `unsafeSign`, typed-data, AENS/oracle `signDelegation`) would otherwise
 * hit an uncaught `TypeError: … is not a function`. These stubs fail loud and
 * labelled instead — matching the P1 `EncryptedHdAccount`'s defensive posture.
 */
export interface InlineSdkAccount {
  readonly address: Encoded.AccountAddress;
  signTransaction(tx: Encoded.Transaction, options?: SignOptions): Promise<Encoded.Transaction>;
  signMessage(message: string): Promise<Uint8Array>;
  unsafeSign(): Promise<never>;
  sign(): Promise<never>;
  signTypedData(): Promise<never>;
  signDelegation(): Promise<never>;
}

const notSupported = (method: string): never => {
  throw new Error(`inline wallet: ${method}() is not supported`);
};

export function createInlineSdkAccount(opts: InlineSdkAccountOpts): InlineSdkAccount {
  // Load the encrypted vault fresh and build the (stateless) signer per call.
  // The record is only ciphertext; UV + unseal + derive + sign + drop all happen
  // inside InlineWalletSigner, once per signature.
  async function signerNow() {
    const record = await opts.store.load();
    if (!record) throw new Error('inline wallet: no vault found on this device');
    return createInlineWalletSigner({
      address: opts.address,
      index: opts.index,
      record,
      unlock: opts.unlock,
      networkId: opts.networkId,
    });
  }

  return {
    address: opts.address as Encoded.AccountAddress,
    async signTransaction(tx, options) {
      return (await signerNow()).signTransaction(tx, options);
    },
    async signMessage(message) {
      return (await signerNow()).signMessage(message);
    },
    async unsafeSign() { return notSupported('unsafeSign'); },
    async sign() { return notSupported('sign'); },
    async signTypedData() { return notSupported('signTypedData'); },
    async signDelegation() { return notSupported('signDelegation'); },
  };
}
