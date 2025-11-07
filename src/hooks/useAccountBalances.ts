import { useAtom } from "jotai";
import { aex9BalancesAtom, balanceAtom, chainNamesAtom } from "../atoms/walletAtoms";
import { useAeSdk } from "./useAeSdk";
import { useEffect, useMemo } from "react";
import { Decimal } from "../libs/decimal";
import { toAe } from "@aeternity/aepp-sdk";
import { DEX_ADDRESSES, getTokenBalance } from "../libs/dex";
import { BridgeConstants } from "@/features/ae-eth-bridge";

export const useAccountBalances = (selectedAccount: string) => {
    const { sdk } = useAeSdk();
    const [chainNames] = useAtom(chainNamesAtom);
    const [_balance, setBalance] = useAtom(balanceAtom);
    const [_aex9Balances, setAex9Balances] = useAtom(aex9BalancesAtom);

    const balance = useMemo(() => _balance[selectedAccount] || 0, [_balance, selectedAccount]);
    const decimalBalance = useMemo(() => Decimal.from((toAe(balance ?? 0))), [balance]);

    const aex9Balances = useMemo(() => _aex9Balances[selectedAccount] || [], [_aex9Balances, selectedAccount]);

    async function getAccountBalance() {
        if (!selectedAccount) return;
        const balance = await sdk?.getBalance(selectedAccount);
        setBalance(prev => ({ ...prev, [selectedAccount]: balance }));
    }

    const _loadAex9DataFromMdw = async (url, items = []) => {
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
    }
    async function loadAccountAex9Balances() {
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
    }

    async function loadAccountData() {
        if (selectedAccount) {
            getAccountBalance();
            loadAccountAex9Balances();
        }
    }

    // Automatically reload account data when the selected account changes
    useEffect(() => {
        if (selectedAccount) {
            console.log("[useAccountBalances] Account changed, reloading data for:", selectedAccount);
            loadAccountData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAccount]);

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