import { useContext, useMemo } from "react";
import { AeSdkContext } from "../context/AeSdkProvider";
import { WalletInfo } from "node_modules/@aeternity/aepp-sdk/es/aepp-wallet-communication/rpc/types";
import { useAtom } from "jotai";
import { walletInfoAtom } from "../atoms/walletAtoms";

export const useAeSdk = () => {
    const [walletInfo, setWalletInfo] = useAtom<WalletInfo | undefined>(walletInfoAtom);

    const context = useContext(AeSdkContext);
    if (!context) {
        throw new Error("useAeSdk must be used within an AeSdkProvider");
    }
    const sdk = useMemo(() => {
        if (walletInfo && context.activeAccount) {
            // if (context.aeSdk?._accounts?.current) {
            return context.aeSdk;
        }
        return context.staticAeSdk;
    }, [context.aeSdk, context.staticAeSdk]);

    return {
        ...context,
        sdk,
    };
};