import { useWallet } from "./useWallet";
import { useAtom } from "jotai";
import { chainNamesAtom } from "../atoms/walletAtoms";
import { useMemo, useEffect } from "react";
import { useAeSdk } from "./useAeSdk";

export function useChainName(accountAddress: string) {
    const { sdk, activeNetwork } = useAeSdk();

    const [chainNames] = useAtom(chainNamesAtom);

    const chainName = useMemo(() => chainNames[accountAddress], [chainNames, accountAddress]);


    useEffect(() => {
        if (!accountAddress) return;
        if (chainNames[accountAddress]) return;
    }, [accountAddress, chainNames, activeNetwork.middlewareUrl]);

    return { chainName };
}

export function useSuperheroChainNames() {

    const [chainNames, setChainNames] = useAtom(chainNamesAtom);

    async function loadChainNames() {
        console.log("loadChainNames");
        const url = `https://superhero-backend-mainnet.prd.service.aepps.com/cache/chainnames`;
        const response = await fetch(url);
        const data = await response.json();
        console.log("loadChainNames->data", data);
        setChainNames(data);
    }

    useEffect(() => {
        loadChainNames();
        
        const interval = setInterval(() => {
            loadChainNames();
        }, 1000 * 30); // 30 seconds

        return () => clearInterval(interval);
    }, []);

    return { chainNames };
}