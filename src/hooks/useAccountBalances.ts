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

  // Keep refs updated
  useEffect(() => {
    sdkRef.current = sdk;
    selectedAccountRef.current = selectedAccount;
  }, [sdk, selectedAccount]);

  const getAccountBalance = useCallback(async () => {
    const account = selectedAccountRef.current;
    if (!account || !sdkRef.current) return;
    const accountBalance = await sdkRef.current.getBalance(account as any);
    // Convert balance to number if it's a string
    const balanceNum = typeof accountBalance === 'string' ? Number(accountBalance) : accountBalance;
    setBalance((prev) => ({ ...prev, [account]: balanceNum }));
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

  const loadAccountData = useCallback(async () => {
    const account = selectedAccountRef.current;
    if (account) {
      await getAccountBalance();
      await loadAccountAex9Balances();
    }
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
