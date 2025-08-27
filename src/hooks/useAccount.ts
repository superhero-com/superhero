import { useAtom } from "jotai";
import { balanceAtom, chainNamesAtom } from "../atoms/walletAtoms";
import { useAeSdk } from "./useAeSdk";
import { useEffect, useMemo } from "react";
import { Decimal } from "../libs/decimal";
import { toAe } from "@aeternity/aepp-sdk";

export const useAccount = () => {
    const { sdk, activeAccount } = useAeSdk();
    const [chainNames, setChainNames] = useAtom(chainNamesAtom);
    const [balance, setBalance] = useAtom(balanceAtom);

    const decimalBalance = useMemo(() => Decimal.from((toAe(balance ?? 0))), [balance]);


    async function getAccountBalance() {
        if (!activeAccount) return;
        const balance = await sdk?.getBalance(activeAccount);
        setBalance(balance);
        console.log('========================')
        console.log('balance::', balance)
        console.log('========================')
    }

    useEffect(() => {
        getAccountBalance();
    }, [activeAccount]);




    return {
        activeAccount,
        chainNames,
        balance,
        decimalBalance,
    }
};

