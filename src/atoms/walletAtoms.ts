import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { WalletInfo } from 'node_modules/@aeternity/aepp-sdk/es/aepp-wallet-communication/rpc/types';

// Types from rootSlice
export interface TokenBalance { 
  token: string; 
  balance: string;
}

// Core wallet state atoms with persistence
export const addressAtom = atomWithStorage<string | null>('wallet:address', null);
export const balanceAtom = atomWithStorage<Record<string, number>>('wallet:balance', {});
export const selectedCurrencyAtom = atomWithStorage<'eur' | 'usd' | 'cny'>('wallet:currency', 'eur');
export const tokenBalancesAtom = atomWithStorage<TokenBalance[]>('wallet:tokenBalances', []);
export const tokenPricesAtom = atomWithStorage<Record<string, string>>('wallet:tokenPrices', {});
export const cookiesConsentAtom = atomWithStorage<Record<string, boolean>>('wallet:cookiesConsent', {});
export const aex9BalancesAtom = atomWithStorage<Record<string, any[]>>('wallet:aex9Balances', {});

// Non-persisted wallet state
export const profileAtom = atom<Record<string, any>>({});
export const pinnedItemsAtom = atom<any[]>([]);
export const chainNamesAtom = atom<Record<string, string>>({});
export const verifiedUrlsAtom = atom<string[]>([]);
export const graylistedUrlsAtom = atom<string[]>([]);
export const tokenInfoAtom = atom<Record<string, { symbol: string; decimals: number }>>({});
export const wordRegistryAtom = atom<any[]>([]);
export const isHiddenContentAtom = atom<boolean>(true);
export const isNewAccountAtom = atom<boolean>(false);

// Derived atoms
export const isConnectedAtom = atom((get) => get(addressAtom) !== null);
export const hasBalanceAtom = atom((get) => {
  const balance = get(balanceAtom);
  return typeof balance === 'number' ? balance > 0 : parseFloat(balance) > 0;
});


// New Atoms
export const walletInfoAtom = atomWithStorage<WalletInfo | undefined>('wallet:walletInfo', undefined);