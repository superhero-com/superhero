import {
    BrowserWindowMessageConnection,
    walletDetector,
    SUBSCRIPTION_TYPES,
} from "@aeternity/aepp-sdk";
import { useAtom } from "jotai";
import { useAeSdk } from "./useAeSdk";
import { IS_FRAMED_AEPP, IS_MOBILE, IS_SAFARI } from "../utils/constants";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { WalletInfo } from "node_modules/@aeternity/aepp-sdk/es/aepp-wallet-communication/rpc/types";
import { createDeepLinkUrl } from "../utils/url";
import { validateHash } from "../utils/address";
import { TrendminerApi } from "../api/backend";
import configs from "../configs";
import type { Wallet, Wallets, NetworkId } from "../utils/types";
import { walletInfoAtom } from "../atoms/walletAtoms";


export function useWalletConnect() {
    const wallet = useRef<Wallet | undefined>(undefined);
    const [walletInfo, setWalletInfo] = useAtom<WalletInfo | undefined>(walletInfoAtom);
    const [scanningForAccounts, setScanningForAccounts] = useState(false);
    const [connectingWallet, setConnectingWallet] = useState(false);
    const [walletConnected, setWalletConnected] = useState(false);
    const [activeNetworkId, setActiveNetworkId] = useState<NetworkId | null>(null);

    const location = useLocation();
    const navigate = useNavigate();
    const { sdk, aeSdk, scanForAccounts, addStaticAccount, setActiveAccount, setAccounts, activeAccount } = useAeSdk();

    // Get available networks from config
    const availableNetworks = Object.values(configs.networks).filter(network => !network.disabled);

    // React equivalent of Vue watch for route query parameters
    useEffect(() => {
        async function checkAddressWalletConnection() {
            const query = Object.fromEntries(new URLSearchParams(location.search).entries());

            // alert(JSON.stringify(query));

            if (query.address && !activeAccount) {
                const address = query.address as string;
                const addressValidation = validateHash(address);

                if (!addressValidation.valid) {
                    alert("Invalid Aeternity address");
                    navigate({ search: '' });
                    return;
                }

                await addStaticAccount(address);
                navigate({ search: '' });
            }
        }
        checkAddressWalletConnection()
    }, [location.search]);


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
                    await aeSdk.subscribeAddress(
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
            await aeSdk.disconnectWallet();
        } catch (error) {
            //
        }
        setConnectingWallet(true);
        wallet.current ??= await scanForWallets();

        if (!wallet.current) {
            setConnectingWallet(false);
            return !IS_FRAMED_AEPP ? deepLinkWalletConnect() : null;
        }

        try {
            const _walletInfo = await aeSdk.connectToWallet(wallet.current.getConnection());
            setWalletInfo(_walletInfo);
            console.log("[useWalletConnect] connectWallet _walletInfo", _walletInfo);

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
            await aeSdk.disconnectWallet();
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
        if (connectingWallet) {
            return;
        }


        console.log("[useWalletConnect] checkWalletConnection activeAccount", activeAccount, walletConnected);

        if (
            // route.name !== "tx-queue" &&
            activeAccount &&
            !walletConnected
        ) {
            if (walletInfo) {
                connectWallet();
            } else {
                addStaticAccount(activeAccount);
            }
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
        activeNetworkId,
        setActiveNetworkId,
        availableNetworks,
    };
}
