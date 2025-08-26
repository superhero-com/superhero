import { useAtom } from "jotai";
import { chainNamesAtom } from "../atoms/walletAtoms";
import { useAeSdk } from "./useAeSdk";

export const useAccount = () => {
    const { sdk, activeAccount } = useAeSdk();
    const [chainNames, setChainNames] = useAtom(chainNamesAtom);




    return {
        activeAccount,
        chainNames,
    }
};

