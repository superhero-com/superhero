/**
 * Cleartext wallet manifest types — public data only.
 *
 * `WalletManifest`/`WalletAccount` model ONLY data that is safe in cleartext
 * (on-chain public addresses, user-chosen labels, an index, a pointer to the
 * active address). This file must NEVER grow a seed/mnemonic/secret-key/
 * passphrase/recovery-code field — that is the encrypted `VaultRecord`
 * envelope from the wallet build plan §4.2, which is
 * P2+ scope and explicitly not modeled here yet (see the placeholder comment
 * below). If you find yourself adding a field that could hold secret
 * material to this file, stop — that is out of P1 scope.
 */

/** One derived account, keyed by its (public) address. */
export interface WalletAccount {
  /** BIP32/SLIP-10 account index this address was derived at. Not secret. */
  index: number;
  /** On-chain public address (`ak_…`). Safe in cleartext. */
  address: string;
  /** User-chosen display label. Convention: never put secrets in a label. */
  label: string;
}

/** The cleartext, per-wallet manifest — no seed/secret material. */
export interface WalletManifest {
  accounts: WalletAccount[];
  /** Pointer by ADDRESS (not index) so it stays valid across re-derivation. */
  activeAddress: string | null;
}

// P2: the encrypted seed envelope (`VaultRecord` — see the wallet build plan §4.2:
// AES-256-GCM-sealed mnemonic, per-factor wrapped DEK) is a SEPARATE,
// encrypted-at-rest structure. It is gated behind P2 and intentionally not
// modeled in this file yet — do not add it ahead of that gate.
