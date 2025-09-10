import { useAtom } from "jotai";
import { chainNamesAtom } from "../atoms/walletAtoms";
import { useAccountBalances } from "./useAccountBalances";
import { useAeSdk } from "./useAeSdk";

export const useAccount = () => {
    const { sdk, activeAccount, activeNetwork } = useAeSdk();
    const accountBalances = useAccountBalances(activeAccount);
    const [chainNames, setChainNames] = useAtom(chainNamesAtom);


    return {
        ...accountBalances,
        activeAccount,
        chainNames,
    }
};

