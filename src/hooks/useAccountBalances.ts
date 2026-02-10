import { useAtom } from 'jotai';
import {
  useEffect, useMemo, useCallback, useRef,
} from 'react';
import { toAe } from '@aeternity/aepp-sdk';
import { BridgeConstants } from '@/features/ae-eth-bridge';
import { aex9BalancesAtom, balanceAtom, chainNamesAtom } from '../atoms/walletAtoms';
import { useAeSdk } from './useAeSdk';
import { Decimal } from '../libs/decimal';
import { DEX_ADDRESSES, getTokenBalance } from '../libs/dex';

const ACCOUNT_DATA_TTL_MS = 30_000;
const accountLoadRequests = new Map<string, Promise<void>>();
const accountLastLoadedAt = new Map<string, number>();

export const useAccountBalances = (selectedAccount: string) => {
  const { sdk } = useAeSdk();
  const [chainNames] = useAtom(chainNamesAtom);
  const [_balance, setBalance] = useAtom(balanceAtom);
  const [_aex9Balances, setAex9Balances] = useAtom(aex9BalancesAtom);

  const balance = useMemo(() => _balance[selectedAccount] || 0, [_balance, selectedAccount]);
  const decimalBalance = useMemo(() => Decimal.from((toAe(balance ?? 0))), [balance]);

  const aex9Balances = useMemo(
    () => _aex9Balances[selectedAccount] || [],
    [_aex9Balances, selectedAccount],
  );

  // Use refs to store stable references and avoid recreating callbacks
  const sdkRef = useRef(sdk);
  const selectedAccountRef = useRef(selectedAccount);
  const balanceRef = useRef(_balance);
  const aex9BalancesRef = useRef(_aex9Balances);

  // Keep refs updated
  useEffect(() => {
    sdkRef.current = sdk;
    selectedAccountRef.current = selectedAccount;
    balanceRef.current = _balance;
    aex9BalancesRef.current = _aex9Balances;
  }, [sdk, selectedAccount, _balance, _aex9Balances]);

  const getAccountBalance = useCallback(async () => {
    const account = selectedAccountRef.current;
    if (!account || !sdkRef.current) return;
    const accountBalance = await sdkRef.current.getBalance(account as any);
    // Convert balance to number if it's a string
    const balanceNum = typeof accountBalance === 'string' ? Number(accountBalance) : accountBalance;
    setBalance((prev) => (prev[account] === balanceNum ? prev : { ...prev, [account]: balanceNum }));
  }, [setBalance]);

  const loadAex9DataFromMdw = useCallback(async (url: string, items: any[] = []): Promise<any[]> => {
    try {
      // Check if url is already a full URL (absolute) or a relative path
      const fetchUrl = url.startsWith('http://') || url.startsWith('https://')
        ? url
        : `${BridgeConstants.aeAPI}${url}`;
      const response = await fetch(fetchUrl);

      if (!response.ok) {
        console.warn(`Failed to fetch AEX9 balances: ${response.status} ${response.statusText}`);
        return items;
      }

      const data = await response.json();

      if (data.next) {
        return loadAex9DataFromMdw(data.next, items.concat(data.data || []));
      }
      return items.concat(data.data || []);
    } catch (error) {
      console.error('Error loading AEX9 balances:', error);
      return items;
    }
  }, []);

  const loadAccountAex9Balances = useCallback(async () => {
    const account = selectedAccountRef.current;
    if (!account) return [];
    const url = `/v2/aex9/account-balances/${account}?limit=100`;

    const balances = await loadAex9DataFromMdw(url, []);

    // Check if WAE is already in the middleware response
    const hasWae = balances.some((b) => b.contract_id === DEX_ADDRESSES.wae);

    // Only fetch WAE separately if it's not in the middleware response
    // This eliminates an unnecessary blockchain call when WAE is already present
    if (!hasWae) {
      const waeBalances = await getTokenBalance(sdkRef.current, DEX_ADDRESSES.wae, account);
      balances.push({
        contract_id: DEX_ADDRESSES.wae,
        amount: waeBalances.toString(),
        decimals: 18,
        name: 'Wrapped AE',
        symbol: 'WAE',
      });
    }

    setAex9Balances((prev) => ({
      ...prev, [account]: balances,
    }));
    return balances;
  }, [loadAex9DataFromMdw, setAex9Balances]);

  const loadAccountData = useCallback(async ({ force = false }: { force?: boolean } = {}) => {
    const account = selectedAccountRef.current;
    if (!account) return;

    const cachedBalance = balanceRef.current[account];
    const cachedAex9 = aex9BalancesRef.current[account];
    const hasCachedData = cachedBalance != null && Array.isArray(cachedAex9);
    const lastLoadedAt = accountLastLoadedAt.get(account) || 0;
    const isFresh = hasCachedData && Date.now() - lastLoadedAt < ACCOUNT_DATA_TTL_MS;

    if (!force && isFresh) return;

    const inFlightRequest = accountLoadRequests.get(account);
    if (inFlightRequest) {
      await inFlightRequest;
      return;
    }

    const request = (async () => {
      await getAccountBalance();
      await loadAccountAex9Balances();
      accountLastLoadedAt.set(account, Date.now());
    })().finally(() => {
      accountLoadRequests.delete(account);
    });

    accountLoadRequests.set(account, request);
    await request;
  }, [getAccountBalance, loadAccountAex9Balances]);

  // Store loadAccountData in a ref to avoid including it in effect dependencies
  const loadAccountDataRef = useRef(loadAccountData);
  useEffect(() => {
    loadAccountDataRef.current = loadAccountData;
  }, [loadAccountData]);

  // Automatically reload account data when the selected account changes
  // Only depend on selectedAccount to avoid infinite loops
  useEffect(() => {
    if (selectedAccount) {
      loadAccountDataRef.current();
    }
  }, [selectedAccount]);

  return {
    selectedAccount,
    chainNames,
    balance,
    decimalBalance,
    aex9Balances,
    loadAccountData,
    loadAccountAex9Balances,
  };
};
