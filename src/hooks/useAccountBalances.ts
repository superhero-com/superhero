import { useAtom } from "jotai";
import { aex9BalancesAtom, balanceAtom, chainNamesAtom } from "../atoms/walletAtoms";
import { useAeSdk } from "./useAeSdk";
import { useEffect, useMemo, useCallback } from "react";
import { Decimal } from "../libs/decimal";
import { toAe } from "@aeternity/aepp-sdk";
import { DEX_ADDRESSES, getTokenBalance } from "../libs/dex";
import { BridgeConstants } from "@/features/ae-eth-bridge";

export const useAccountBalances = (selectedAccount: string) => {
    const { sdk, activeAccount } = useAeSdk();
    const [chainNames] = useAtom(chainNamesAtom);
    const [_balance, setBalance] = useAtom(balanceAtom);
    const [_aex9Balances, setAex9Balances] = useAtom(aex9BalancesAtom);

    const balance = useMemo(() => _balance[selectedAccount] || 0, [_balance, selectedAccount]);
    const decimalBalance = useMemo(() => Decimal.from((toAe(balance ?? 0))), [balance]);

    const aex9Balances = useMemo(() => _aex9Balances[selectedAccount] || [], [_aex9Balances, selectedAccount]);

    const getAccountBalance = useCallback(async () => {
        if (!selectedAccount) return;
        const balance = await sdk?.getBalance(selectedAccount);
        setBalance(prev => ({ ...prev, [selectedAccount]: balance }));
    }, [selectedAccount, sdk]);

    const _loadAex9DataFromMdw = useCallback(async (url: string, items: any[] = []): Promise<any[]> => {
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
                return _loadAex9DataFromMdw(data.next, items.concat(data.data || []));
            }
            return items.concat(data.data || []);
        } catch (error) {
            console.error('Error loading AEX9 balances:', error);
            return items;
        }
    }, []);

    const loadAccountAex9Balances = useCallback(async () => {
        if (!selectedAccount) return;
        const url = `/v2/aex9/account-balances/${selectedAccount}?limit=100`;

        const balances = await _loadAex9DataFromMdw(url, []);
        const waeBalances = await getTokenBalance(sdk, DEX_ADDRESSES.wae, selectedAccount);

        const accountBalances = balances.concat({
            contract_id: DEX_ADDRESSES.wae,
            amount: waeBalances.toString(),
            decimals: 18,
            name: 'Wrapped AE',
            symbol: 'WAE',
        });
        setAex9Balances(prev => ({
            ...prev, [selectedAccount]: accountBalances
        }));
        return accountBalances;
    }, [selectedAccount, sdk, _loadAex9DataFromMdw]);

    const loadAccountData = useCallback(async () => {
        if (selectedAccount) {
            await getAccountBalance();
            await loadAccountAex9Balances();
        }
    }, [selectedAccount, getAccountBalance, loadAccountAex9Balances]);

    // Automatically reload account data when the selected account or SDK changes
    useEffect(() => {
        if (selectedAccount) {
            loadAccountData();
        }
    }, [selectedAccount, loadAccountData]);

    return {
        selectedAccount,
        chainNames,
        balance,
        decimalBalance,
        aex9Balances,
        loadAccountData,
        loadAccountAex9Balances,
    }
};