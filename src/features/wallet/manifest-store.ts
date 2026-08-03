/**
 * P4 — persistence for the CLEARTEXT `WalletManifest` (build-plan §5.2).
 *
 * The manifest holds only public data — on-chain `ak_…` addresses, the account
 * index each was derived at, user labels, and a pointer to the active address.
 * It deliberately lives in `localStorage`, NOT in the encrypted vault, for one
 * load-bearing reason: `AeSdkProvider`'s signer factory (`makeSigner`) installs
 * an account SYNCHRONOUSLY and the SDK reads `.address` immediately, so the
 * address→index lookup must be available without an `await` and without an
 * unlock. That is exactly the split the build plan prescribes: addresses in the
 * clear, secrets in the `VaultRecord`.
 *
 * INVARIANT — never write secret material here. No mnemonic, seed, secret key,
 * passphrase, recovery code, KEK, or DEK. If a field you are about to add could
 * hold any of those, it belongs in the encrypted envelope (`vault-record.ts`),
 * not in this file. The manifest being world-readable is by design.
 *
 * Losing the manifest is recoverable (unlock once and re-derive addresses from
 * index 0 upward); losing the vault is not. So this store is best-effort by
 * design and every read tolerates absent/corrupt data by returning `null`.
 */
import type { WalletManifest } from './types';

const STORAGE_KEY = 'wallet.inlineManifest';

const storage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Safari private mode / storage disabled — treat as "no manifest".
    return null;
  }
};

/** Shape-check a parsed value before trusting it as a manifest. */
function isManifest(value: unknown): value is WalletManifest {
  const m = value as WalletManifest | null;
  if (!m || typeof m !== 'object' || !Array.isArray(m.accounts)) return false;
  return m.accounts.every((a) => (
    typeof a?.address === 'string' && typeof a?.index === 'number' && Number.isInteger(a.index)
  ));
}

/** Read the manifest, or `null` when absent/unreadable/malformed. Never throws. */
export function loadManifest(): WalletManifest | null {
  const raw = storage()?.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isManifest(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Persist the manifest. Best-effort — a quota/private-mode failure is not fatal. */
export function saveManifest(manifest: WalletManifest): void {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(manifest));
  } catch {
    // Non-fatal: addresses are re-derivable from the vault after one unlock.
  }
}

/** Drop the manifest (device reset). Does NOT touch the encrypted vault. */
export function clearManifest(): void {
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    // Non-fatal.
  }
}

/**
 * The derivation index for `address`, or `null` when this address is not an
 * inline-wallet account on this device.
 *
 * This is the sole test `makeSigner` uses to decide "inline signer vs the
 * existing delegated relay", so a `null` here is what keeps an
 * externally-connected wallet (extension / `wallet.superhero.com` / deep link)
 * on its own signing path untouched.
 */
export function indexForAddress(address: string): number | null {
  const account = loadManifest()?.accounts.find((a) => a.address === address);
  return account ? account.index : null;
}

/** Build the initial single-account manifest for a freshly onboarded wallet. */
export function manifestForFirstAccount(address: string): WalletManifest {
  return {
    accounts: [{ index: 0, address, label: 'Account 1' }],
    activeAddress: address,
  };
}
