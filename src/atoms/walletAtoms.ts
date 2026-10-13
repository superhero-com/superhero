import { CurrencyCode } from '@/utils/types';
import type { PreferredChainNames } from '@/utils/preferredChainName';
import { getSafeLocalStringStorage, safeLocalJSONStorage } from '@/utils/jotaiSafeLocalStorage';
import { atom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import { WalletInfo } from 'node_modules/@aeternity/aepp-sdk/es/aepp-wallet-communication/rpc/types';

// Types from rootSlice
export interface TokenBalance {
  token: string;
  balance: string;
}

// Core wallet state atoms with persistence (quota-safe; see jotaiSafeLocalStorage)
export const addressAtom = atomWithStorage<string | null>('wallet:address', null, safeLocalJSONStorage);
export const balanceAtom = atomWithStorage<Record<string, number>>('wallet:balance', {}, safeLocalJSONStorage);
export const selectedCurrencyAtom = atomWithStorage<CurrencyCode>('wallet:currency', 'usd', safeLocalJSONStorage);
export const tokenBalancesAtom = atomWithStorage<TokenBalance[]>('wallet:tokenBalances', [], safeLocalJSONStorage);
export const tokenPricesAtom = atomWithStorage<Record<string, string>>('wallet:tokenPrices', {}, safeLocalJSONStorage);
export const cookiesConsentAtom = atomWithStorage<Record<string, boolean>>('wallet:cookiesConsent', {}, safeLocalJSONStorage);
/** In-memory only — full AEX-9 lists can exceed localStorage quota when paginated from MDW. */
export const aex9BalancesAtom = atom<Record<string, any[]>>({});

// Non-persisted wallet state
export const profileAtom = atom<Record<string, any>>({});
export const pinnedItemsAtom = atom<any[]>([]);
export const chainNamesAtom = atomWithStorage<Record<string, string>>('wallet:chainNames', {}, safeLocalJSONStorage);
export const chainNameLookupCheckedAtAtom = atomWithStorage<Record<string, number>>('wallet:chainNames:checkedAt', {}, safeLocalJSONStorage);
/**
 * Display .chain name per account as the API resolves it (the linked preferred
 * name first), plus names the user just picked or claimed that the API has not
 * indexed yet. Overrides `chainNamesAtom`, which holds the newest owned name.
 */
export const preferredChainNamesAtom = atomWithStorage<PreferredChainNames>(
  'wallet:preferredChainNames',
  {},
  createJSONStorage<PreferredChainNames>(getSafeLocalStringStorage),
);
/** Profile display names (public_name from /api/profile). Used for author labels in feed. */
export const profileDisplayNamesAtom = atom<Record<string, string>>({});
export const verifiedUrlsAtom = atom<string[]>([]);
export const graylistedUrlsAtom = atom<string[]>([]);
export const tokenInfoAtom = atom<Record<string, { symbol: string; decimals: number }>>({});
export const wordRegistryAtom = atom<any[]>([]);
export const isHiddenContentAtom = atom<boolean>(true);
export const isNewAccountAtom = atom<boolean>(false);

// Wallet connection state (non-persisted, runtime only)
export const walletConnectedAtom = atom<boolean>(false);
export const connectingWalletAtom = atom<boolean>(false);
export const scanningForAccountsAtom = atom<boolean>(false);

// Derived atoms
export const isConnectedAtom = atom((get) => get(addressAtom) !== null);
export const hasBalanceAtom = atom((get) => {
  const byAccount = get(balanceAtom);
  if (byAccount instanceof Promise) return false;
  if (typeof byAccount === 'number') return byAccount > 0;
  if (byAccount && typeof byAccount === 'object') {
    return Object.values(byAccount).some((n) => Number(n) > 0);
  }
  return false;
});

// New Atoms
// getOnInit: hydrate synchronously so the reconnection flow can tell a previously
// connected wallet session apart from a fresh visit on the very first render.
export const walletInfoAtom = atomWithStorage<WalletInfo | undefined>('wallet:walletInfo', undefined, safeLocalJSONStorage, { getOnInit: true });
