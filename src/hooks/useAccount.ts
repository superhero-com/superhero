import { useAtom } from "jotai";
import { aex9BalancesAtom, balanceAtom, chainNamesAtom } from "../atoms/walletAtoms";
import { useAeSdk } from "./useAeSdk";
import { useEffect, useMemo } from "react";
import { Decimal } from "../libs/decimal";
import { toAe } from "@aeternity/aepp-sdk";

export const useAccount = () => {
    const { sdk, activeAccount, activeNetwork } = useAeSdk();
    const [chainNames, setChainNames] = useAtom(chainNamesAtom);
    const [balance, setBalance] = useAtom(balanceAtom);
    const [_aex9Balances, setAex9Balances] = useAtom(aex9BalancesAtom);

    const decimalBalance = useMemo(() => Decimal.from((toAe(balance ?? 0))), [balance]);

    const aex9Balances = useMemo(() => _aex9Balances[activeAccount] || [], [_aex9Balances, activeAccount]);

    async function getAccountBalance() {
        if (!activeAccount) return;
        const balance = await sdk?.getBalance(activeAccount);
        setBalance(balance);
        console.log('========================')
        console.log('balance::', balance)
        console.log('========================')
    }

    const _loadAex9DataFromMdw = async (url, items = []) => {
        const fetchUrl = `${activeNetwork.middlewareUrl}${url}`
        const response = await fetch(fetchUrl);
        const data = await response.json();

        if (data.next) {
            return _loadAex9DataFromMdw(items.concat(data.data));
        }
        return items.concat(data.data);
    }
    async function loadAccountAex9Balances() {
        const url = `/v3/accounts/${activeAccount}/aex9/balances?limit=100`;

        const balances = await _loadAex9DataFromMdw(url, []);
        setAex9Balances(prev => ({ ...prev, [activeAccount]: balances }));
        // if (!activeAccount) return;
        // const balances = await sdk?.getAex9Balances(activeAccount);
        // setAex9Balances(balances);
        console.log('========================')
        console.log('aex9Balances::', balances)
        console.log('========================')
    }

    async function loadAccountData() {
        if (activeAccount) {
            getAccountBalance();
            loadAccountAex9Balances();
        }
    }


    return {
        activeAccount,
        chainNames,
        balance,
        decimalBalance,
        aex9Balances,
        loadAccountData
    }
};

