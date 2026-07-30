import { type Encoded } from '@aeternity/aepp-sdk';

/**
 * `EncryptedHdAccount` — P1 SKELETON ONLY.
 *
 * This is the shell described in the wallet build plan
 * §5.4/§8 (phase P1: "prove the SDK swap"). It exists purely to prove that an
 * `AccountBase`-shaped signer can be installed at the
 * `staticAeSdk.addAccount(...)` point in `AeSdkProvider.tsx` in place of the
 * delegated (deep-link/relay) account object, gated behind
 * `INLINE_WALLET_ENABLED` (see `config.ts`) and `isStandalone()`.
 *
 * It holds NO key, NO mnemonic, and performs NO cryptography:
 *  - `address` comes from the caller (the cleartext manifest — see
 *    `types.ts` — knows addresses without any unlock, exactly like the real
 *    P4 design).
 *  - every signing method throws a clearly-labelled "not implemented" error.
 *    This is deliberate: a stub that returned a fake/placeholder signature
 *    could be mistaken for a real one downstream. Throwing makes any
 *    accidental reachability immediately and loudly obvious.
 *
 * Real envelope-encrypted seed custody (unlock → decrypt → derive → sign →
 * zeroize) is P2+ and gated — see the wallet build plan
 * §4 and `the custody decision-wallet-key-custody.md`. Do not add mnemonic/crypto/
 * WebAuthn/IndexedDB code to this file ahead of that gate.
 */

/** Exported so tests can assert on the exact stub message without duplicating it. */
export const P1_SIGNING_NOT_IMPLEMENTED_MESSAGE = 'inline wallet P1 skeleton: signing not implemented';

const stub = (): never => {
  throw new Error(P1_SIGNING_NOT_IMPLEMENTED_MESSAGE);
};

// Structurally AccountBase-shaped (address + sign methods) but does NOT
// `extends AccountBase`: the existing delegated signer is likewise a plain
// object cast at the `addAccount` install point (AeSdkProvider.tsx), and the
// SDK accepts the shape without an instanceof check. Not extending the base
// also avoids overriding its concrete `address` property. P2 can revisit if
// real AccountBase wiring is ever needed.
//
// Every signing method below is an intentional throwing stub (P1 holds no key),
// so none references `this` — that is by design, not an oversight.
/* eslint-disable class-methods-use-this */
export class EncryptedHdAccount {
  readonly address: Encoded.AccountAddress;

  constructor(address: string) {
    this.address = address as Encoded.AccountAddress;
  }

  async signTransaction(): Promise<Encoded.Transaction> {
    return stub();
  }

  async signMessage(): Promise<Uint8Array> {
    return stub();
  }

  async signTypedData(): Promise<Encoded.Signature> {
    return stub();
  }

  async signDelegation(): Promise<Encoded.Signature> {
    return stub();
  }

  async unsafeSign(): Promise<Uint8Array> {
    return stub();
  }

  /** @deprecated mirrors `AccountBase.sign` — delegates to `unsafeSign`, still a stub. */
  async sign(): Promise<Uint8Array> {
    return stub();
  }
}

/** Factory matching the plan's `createEncryptedHdAccount(address)` shape. */
export function createEncryptedHdAccount(address: string): EncryptedHdAccount {
  return new EncryptedHdAccount(address);
}
