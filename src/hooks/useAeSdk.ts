import { useContext, useEffect, useMemo } from "react";
import { AeSdkContext } from "../context/AeSdkProvider";
import { WalletInfo } from "node_modules/@aeternity/aepp-sdk/es/aepp-wallet-communication/rpc/types";
import { useAtom } from "jotai";
import { walletInfoAtom } from "../atoms/walletAtoms";
import { activeAccountAtom } from "@/atoms/accountAtoms";

export const useAeSdk = () => {
    const [walletInfo, setWalletInfo] = useAtom<WalletInfo | undefined>(walletInfoAtom);
    const [activeAccount, setActiveAccount] = useAtom<string | undefined>(activeAccountAtom);

    const context = useContext(AeSdkContext);
    if (!context) {
        throw new Error("useAeSdk must be used within an AeSdkProvider");
    }
    const sdk = useMemo(() => {
        if (walletInfo && activeAccount) {
            return context.aeSdk;
        }
        return context.staticAeSdk;
    }, [walletInfo, activeAccount, context.aeSdk, context.staticAeSdk]);

    return {
        ...context,
        sdk,
        // Override activeAccount from context with the atom value to ensure reactivity
        activeAccount,
    };
};