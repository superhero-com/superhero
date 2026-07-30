/**
 * P4 core — the inline signer (the wallet build plan §3.2/§5.4, the threat model R-02).
 *
 * `InlineWalletSigner` is AccountBase-shaped and signs IN-PAGE by, on EVERY call:
 *   1. running the caller-supplied `UnlockProvider` — this performs USER
 *      VERIFICATION (a WebAuthn PRF ceremony, or the passphrase prompt) and
 *      returns the factor's KEK. There is NO cached unlock;
 *   2. unwrapping the DEK + unsealing the mnemonic (transient);
 *   3. deriving the active account's key and signing;
 *   4. dropping the references (R-05: a JS string can't be truly zeroed — the
 *      guarantee is that nothing survives this scope, not that memory is wiped).
 *
 * THE non-negotiable rule (the custody decision, the threat model): user-verification per
 * signature, no session-cached seed. Do not add a "unlock once, sign many"
 * fast-path — that collapses the same-origin custody model. The UnlockProvider
 * is also where the WYSIWYS transaction confirmation must be shown to the user
 * before it returns a KEK (the confirm UI lives in the provider, wired at P4
 * integration; this core stays UI-agnostic and unit-testable).
 */
import { type Encoded } from '@aeternity/aepp-sdk';
import { deriveSigner } from './derivation';
import { unlockVault, type VaultRecord } from './vault-record';

/**
 * Performs user-verification and returns the KEK for one of the vault's factors.
 * Implementations: passphrase prompt (kekFromPassphrase) or WebAuthn PRF
 * (evaluatePrf → kekFromHighEntropy). MUST re-verify on every call.
 */
export type UnlockProvider = (record: VaultRecord) => Promise<{ factorId: string; kek: CryptoKey }>;

export interface InlineWalletSignerOpts {
  /** the active account's public address (cleartext manifest data). */
  address: string;
  /** the account index to derive under the vault's mnemonic. */
  index: number;
  /** the encrypted vault record. */
  record: VaultRecord;
  /** user-verification + KEK provider (runs every signature). */
  unlock: UnlockProvider;
  /** default network id for signing; a per-call option overrides it. */
  networkId?: string;
}

interface SignOptions { networkId?: string; innerTx?: boolean; [k: string]: unknown }

export class InlineWalletSigner {
  readonly address: Encoded.AccountAddress;

  readonly #index: number;

  readonly #record: VaultRecord;

  readonly #unlock: UnlockProvider;

  readonly #networkId?: string;

  constructor(opts: InlineWalletSignerOpts) {
    this.address = opts.address as Encoded.AccountAddress;
    this.#index = opts.index;
    this.#record = opts.record;
    this.#unlock = opts.unlock;
    this.#networkId = opts.networkId;
  }

  /**
   * Run one UV ceremony, derive the signing key transiently, hand it to `use`,
   * and drop it. Every public sign method goes through here → UV-per-signature.
   */
  async #withSigningAccount<T>(use: (account: ReturnType<typeof deriveSigner>) => Promise<T>): Promise<T> {
    const { factorId, kek } = await this.#unlock(this.#record); // ← USER VERIFICATION, every call
    const { mnemonic } = await unlockVault(this.#record, factorId, kek);
    let account: ReturnType<typeof deriveSigner> | undefined = deriveSigner(mnemonic, this.#index);
    try {
      return await use(account);
    } finally {
      account = undefined; // drop the key-bearing account; no cache survives this scope
    }
  }

  async signTransaction(tx: Encoded.Transaction, options?: SignOptions): Promise<Encoded.Transaction> {
    return this.#withSigningAccount(
      (account) => account.signTransaction(tx, { networkId: this.#networkId, ...options }),
    );
  }

  async signMessage(message: string): Promise<Uint8Array> {
    return this.#withSigningAccount((account) => account.signMessage(message));
  }
}

export function createInlineWalletSigner(opts: InlineWalletSignerOpts): InlineWalletSigner {
  return new InlineWalletSigner(opts);
}
