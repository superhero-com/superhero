import { useAtom } from "jotai";
import { useEffect, useMemo } from "react";
import { chainNamesAtom } from "../atoms/walletAtoms";
import { Backend } from "../api/backend";

export function useChainName(accountAddress: string) {
    const [chainNames,] = useAtom(chainNamesAtom);

    const chainName = useMemo(() => chainNames[accountAddress], [chainNames, accountAddress]);

    return { chainName };
}

export function useSuperheroChainNames() {

    const [chainNames, setChainNames] = useAtom(chainNamesAtom);

    async function loadChainNames() {
        try {
            const data = await Backend.getCacheChainNames();
            setChainNames(data || {});
        } catch (e) {
            // ignore transient errors; keep existing cache
            console.warn('Failed to load chain names', e);
        }
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

export function useAddressByChainName(chainNameInput?: string) {
    const [chainNames] = useAtom(chainNamesAtom);
    const address = useMemo(() => {
        if (!chainNameInput) return null;
        const target = chainNameInput.toLowerCase();
        for (const [addr, name] of Object.entries(chainNames)) {
            if ((name || '').toLowerCase() === target) return addr;
        }
        return null;
    }, [chainNames, chainNameInput]);
    return { address };
}