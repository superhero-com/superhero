/**
 * P4 core — the inline signer (build-plan §3.2/§5.4, threat-model R-02).
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
 * THE non-negotiable rule (adr-0003, threat-model): user-verification per
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
 * What the signer is about to sign, handed to the UnlockProvider so the confirm
 * UI can show the exact payload (WYSIWYS) and bind the user-verification to THIS
 * signature — not merely to "a signature". (threat-model R-02 / adr-0003.)
 */
export interface SigningContext {
  kind: 'transaction' | 'message';
  /** the exact bytes being signed: the `tx_…` string, or the message text. */
  payload: string;
  networkId?: string;
}

/**
 * Performs user-verification and returns the KEK for one of the vault's factors.
 * Implementations: passphrase prompt (kekFromPassphrase) or WebAuthn PRF
 * (evaluatePrf → kekFromHighEntropy). MUST re-verify on every call.
 *
 * `context` is present ONLY for a signature (the signing path —
 * `InlineWalletSigner` — always provides it); it is absent for non-signing
 * unlocks (factor enrollment / recovery). When `context` is present the provider
 * MUST show it to the user (WYSIWYS) before releasing a KEK. NOTE (P4/SR):
 * showing the payload and binding the KEK release to it is enforced only by the
 * provider — the core cannot attest UV happened or that this payload was shown.
 * The passkey provider SHOULD make this binding cryptographic (WebAuthn PRF
 * challenge = H(payload, networkId)) so a KEK obtained for payload A cannot sign
 * payload B. Tracked as a requirement on the P4 UnlockProvider + its SR review.
 */
export type UnlockProvider = (
  record: VaultRecord,
  context?: SigningContext,
) => Promise<{ factorId: string; kek: CryptoKey }>;

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
   * Run one UV ceremony (bound to `context`), derive the signing key transiently,
   * assert it matches the advertised address, hand it to `use`, and drop it.
   * Every public sign method goes through here → UV-per-signature.
   */
  async #withSigningAccount<T>(
    context: SigningContext,
    use: (account: ReturnType<typeof deriveSigner>) => Promise<T>,
  ): Promise<T> {
    // ← USER VERIFICATION, every call, bound to THIS payload (the confirm UI in
    //   the provider sees `context` and must show it before returning a KEK).
    const { factorId, kek } = await this.#unlock(this.#record, context);
    let mnemonic: string | undefined;
    let account: ReturnType<typeof deriveSigner> | undefined;
    try {
      ({ mnemonic } = await unlockVault(this.#record, factorId, kek));
      account = deriveSigner(mnemonic, this.#index);
      // Bind advertised address ↔ signing key: REFUSE to sign under a key that
      // does not derive `this.address`. Guards a vault swap between account
      // install and this signature (the device's single RECORD_KEY='vault' can
      // be overwritten by a restore/import) or a mismatched (address, index) —
      // either would otherwise emit a valid signature the SDK/WYSIWYS
      // misattributes to `this.address`.
      if (account.address !== this.address) {
        throw new Error(
          'inline wallet: derived key does not match the expected account address — refusing to sign',
        );
      }
      return await use(account);
    } finally {
      account = undefined; // drop the key-bearing account; no cache survives this scope
      mnemonic = undefined; // drop the decrypted-seed reference (R-05: best-effort)
    }
  }

  async signTransaction(tx: Encoded.Transaction, options?: SignOptions): Promise<Encoded.Transaction> {
    // Resolve once, so the network shown to the provider (WYSIWYS) is EXACTLY the
    // one handed to the SDK — even if a caller passes networkId: undefined.
    const networkId = options?.networkId ?? this.#networkId;
    return this.#withSigningAccount(
      { kind: 'transaction', payload: tx, networkId },
      (account) => account.signTransaction(tx, { ...options, networkId }),
    );
  }

  async signMessage(message: string): Promise<Uint8Array> {
    return this.#withSigningAccount(
      { kind: 'message', payload: message },
      (account) => account.signMessage(message),
    );
  }
}

export function createInlineWalletSigner(opts: InlineWalletSignerOpts): InlineWalletSigner {
  return new InlineWalletSigner(opts);
}
