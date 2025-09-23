import { useAtom } from "jotai";
import { useEffect, useMemo } from "react";
import { chainNamesAtom } from "../atoms/walletAtoms";

export function useChainName(accountAddress: string) {
    const [chainNames,] = useAtom(chainNamesAtom);

    const chainName = useMemo(() => chainNames[accountAddress], [chainNames, accountAddress]);

    return { chainName };
}

export function useSuperheroChainNames() {

    const [chainNames, setChainNames] = useAtom(chainNamesAtom);

    async function loadChainNames() {
        const url = `https://superhero-backend-mainnet.prd.service.aepps.com/cache/chainnames`;
        const response = await fetch(url);
        const data = await response.json();
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