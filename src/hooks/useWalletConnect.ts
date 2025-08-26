import {
    BrowserWindowMessageConnection,
    walletDetector,
    SUBSCRIPTION_TYPES,
} from "@aeternity/aepp-sdk";
import { useAtom } from "jotai";
import { useAeSdk } from "./useAeSdk";
import { IS_FRAMED_AEPP, IS_MOBILE, IS_SAFARI } from "../utils/constants";
import { useEffect, useRef, useState } from "react";
import { WalletInfo } from "node_modules/@aeternity/aepp-sdk/es/aepp-wallet-communication/rpc/types";
import { createDeepLinkUrl } from "../utils/url";
import type { Wallet, Wallets } from "../utils/types";
import { walletInfoAtom } from "../atoms/walletAtoms";


export function useWalletConnect() {
    const wallet = useRef<Wallet | undefined>(undefined);
    const [walletInfo, setWalletInfo] = useAtom<WalletInfo | undefined>(walletInfoAtom);
    const [scanningForAccounts, setScanningForAccounts] = useState(false);
    const [connectingWallet, setConnectingWallet] = useState(false);
    const [walletConnected, setWalletConnected] = useState(false);

    const { sdk, scanForAccounts, addStaticAccount, setActiveAccount, setAccounts, activeAccount } = useAeSdk();

    //   watch(
    //     () => route.query,
    //     (query) => {
    //       if (query.address && !activeAccount.value) {
    //         const address = query.address as string;
    //         if (!isAddressValid(address)) {
    //           alert("Invalid Aeternity address");
    //           router.push({ query: {} });
    //           return;
    //         }
    //         if (networks.availableNetworks.length === 1) {
    //           networks.activeNetworkId = networks.availableNetworks[0].networkId;
    //         } else if (
    //           query.networkId &&
    //           networks.availableNetworks.some(
    //             ({ networkId }) => networkId === query.networkId,
    //           )
    //         ) {
    //           networks.activeNetworkId = query.networkId as NetworkId;
    //         }
    //         addStaticAccount(address);
    //         getFactory();
    //         router.push({ query: {} });
    //       }
    //     },
    //     {
    //       deep: true,
    //       immediate: true,
    //     },
    //   );

    useEffect(() => {
        const sdkAddresses = sdk?.addresses();
        console.log("[useWalletConnect] activeAccount", activeAccount, sdkAddresses);
        if (activeAccount && sdkAddresses?.length === 0) {
            connectWallet()
        }
    }, [activeAccount]);

    async function subscribeAddress() {
        /*
         * Reset the active account to trigger
         * watchers once the wallet is connected
         */
        setActiveAccount(undefined);
        return new Promise((resolve, reject) => {
            setScanningForAccounts(true);
            const $timeout = setTimeout(() => {
                setScanningForAccounts(false);
                reject();
            }, 10000);

            (async () => {
                try {
                    await sdk.subscribeAddress(
                        SUBSCRIPTION_TYPES.subscribe,
                        "connected",
                    );
                    await scanForAccounts();

                    resolve(true);
                } catch (error) {
                    reject(error);
                } finally {
                    setScanningForAccounts(false);
                    clearTimeout($timeout);
                }
            })();
        });
    }

    async function deepLinkWalletConnect() {
        const addressDeepLink = createDeepLinkUrl({
            type: "address",
            "x-success": `${window.location.href.split("?")[0]
                }?address={address}&networkId={networkId}`,
            "x-cancel": window.location.href.split("?")[0],
        });
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        window.location = addressDeepLink;
    }

    async function connectWallet() {
        // when trying to connect to the wallet all states should be reset and sdk should be disconnected
        setWalletConnected(false);
        setWalletInfo(undefined);
        setActiveAccount(undefined);
        setAccounts([]);

        try {
            await sdk.disconnectWallet();
        } catch (error) {
            //
        }
        setConnectingWallet(true);
        wallet.current ??= await scanForWallets();

        if (!wallet) {
            setConnectingWallet(false);
            return !IS_FRAMED_AEPP ? deepLinkWalletConnect() : null;
        }

        try {
            const _walletInfo = await sdk.connectToWallet(wallet.current.getConnection());
            setWalletInfo(_walletInfo);

            await subscribeAddress();
            setWalletConnected(true);
        } catch (error) {
            console.log("wallet connect error ::", error);
            disconnectWallet();
        }
        setConnectingWallet(false);
    }

    async function disconnectWallet() {
        setWalletInfo(undefined);

        setWalletConnected(false);
        setWalletInfo(undefined);
        setActiveAccount(undefined);
        setAccounts([]);
        try {
            await sdk.disconnectWallet();
        } catch (error) {
            //
        }
    }

    /**
     * Scan for wallets
     */
    async function scanForWallets(): Promise<Wallet | undefined> {
        const foundWallet: Wallet | undefined = await new Promise((resolve) => {
            const $walletConnectTimeout = setTimeout(
                () => {
                    resolve(undefined);
                },
                (IS_MOBILE || IS_SAFARI) && !IS_FRAMED_AEPP ? 100 : 15000,
            );

            const handleWallets = async ({
                newWallet,
            }: {
                newWallet?: Wallet | undefined;
                wallets: Wallets;
            }) => {
                clearTimeout($walletConnectTimeout);
                stopScan();
                resolve(newWallet);
            };

            const scannerConnection = new BrowserWindowMessageConnection({
                debug: true,
            });
            const stopScan = walletDetector(scannerConnection, handleWallets);
        });

        return foundWallet;
    }

    async function checkWalletConnection() {
        if (
            // route.name !== "tx-queue" &&
            walletInfo &&
            activeAccount &&
            !walletConnected
        ) {
            connectWallet();
        }
    }

    return {
        walletInfo,
        checkWalletConnection,

        connectWallet,
        deepLinkWalletConnect,
        disconnectWallet,
        scanForWallets,
        connectingWallet,
        scanningForAccounts,
    };
}
