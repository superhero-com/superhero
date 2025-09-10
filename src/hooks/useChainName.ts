import { useWallet } from "./useWallet";
import { useAtom } from "jotai";
import { chainNamesAtom } from "../atoms/walletAtoms";
import { useMemo, useEffect } from "react";
import { useAeSdk } from "./useAeSdk";

export function useChainName(accountAddress: string) {
    const { sdk, activeNetwork } = useAeSdk();

    const [chainNames, setChainNames] = useAtom(chainNamesAtom);

    const chainName = useMemo(() => chainNames[accountAddress], [chainNames, accountAddress]);

    const _loadLatestUpdatedChainNameFromMdw = async () => {
        const url = `/v3/transactions?account=${accountAddress}&direction=backward&type=name_update`;
        const fetchUrl = `${activeNetwork.middlewareUrl}${url}`
        const response = await fetch(fetchUrl);
        const data = await response.json();
        if (data?.data?.length > 0) {
            const forCurrentAccount = data.data.find((tx: any) => tx.tx.account_id === accountAddress);
            const latestUpdatedChainName = forCurrentAccount?.tx?.name;
            setChainNames(prev => ({ ...prev, [accountAddress]: latestUpdatedChainName }));
        }
    }

    useEffect(() => {
        if (!accountAddress) return;
        if (chainNames[accountAddress]) return;
        _loadLatestUpdatedChainNameFromMdw();
    }, [accountAddress, chainNames, activeNetwork.middlewareUrl]);

    return { chainName };
}   