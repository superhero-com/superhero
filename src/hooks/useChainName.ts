import { useWallet } from "./useWallet";
import { useAtom } from "jotai";
import { chainNamesAtom } from "../atoms/walletAtoms";
import { useMemo, useEffect } from "react";
import { useAeSdk } from "./useAeSdk";

export function useChainName(accountAddress: string) {
    const { activeNetwork } = useAeSdk();

    const [chainNames, setChainNames] = useAtom(chainNamesAtom);

    const chainName = useMemo(() => chainNames[accountAddress], [chainNames, accountAddress]);

    // On-demand fetch safeguard: if global cache hasn't populated yet, try once locally
    useEffect(() => {
        if (!accountAddress) return;
        if (chainNames[accountAddress]) return;
        let cancelled = false;
        (async () => {
            try {
                const url = `https://superhero-backend-mainnet.prd.service.aepps.com/cache/chainnames`;
                const res = await fetch(url, { cache: 'no-store' });
                const data = await res.json();
                if (cancelled) return;
                const found = data?.[accountAddress];
                if (found) {
                    setChainNames((prev) => ({ ...prev, [accountAddress]: found }));
                }
            } catch {
                // ignore
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [accountAddress, chainNames, setChainNames, activeNetwork?.middlewareUrl]);

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