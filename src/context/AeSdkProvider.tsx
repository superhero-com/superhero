import { AeSdk, AeSdkAepp, CompilerHttp, Encoded, Node } from "@aeternity/aepp-sdk";
import { useAtom } from "jotai";
import { createContext, useEffect, useRef, useState } from "react";
import { activeAccountAtom } from "../atoms/accountAtoms";
import { transactionsQueueAtom } from "../atoms/txQueueAtoms";
import { walletInfoAtom } from "../atoms/walletAtoms";
import { useModal } from "../hooks/useModal";
import configs from "../configs";
import { NETWORK_MAINNET } from "../utils/constants";
import { INetwork } from "../utils/types";
import { createDeepLinkUrl } from "../utils/url";
import WebSocketClient from "@/libs/WebSocketClient";

export const AeSdkContext = createContext<{
    aeSdk: AeSdkAepp,
    staticAeSdk: AeSdk,
    sdkInitialized: boolean,
    activeAccount: string,
    currentBlockHeight: number,
    activeNetwork: INetwork,
    accounts: string[],
    setActiveAccount: (account: string) => void,
    setAccounts: (accounts: string[]) => void,
    getCurrentGeneration: () => void,
    addStaticAccount: (account: string) => void,
    setActiveNetwork: (network: INetwork) => void,
    setTransactionsQueue: (queue: Record<string, { status: string; tx: Encoded.Transaction; signUrl: string }>) => void,
    initSdk: () => void,
    scanForAccounts: () => void,
    nodes: { instance: Node; name: string }[],
}>(null);

const nodes: { instance: Node; name: string }[] = Object.values(
    configs.networks,
).map(({ name, url }) => ({
    name,
    instance: new Node(url),
}));

export const AeSdkProvider = ({ children }: { children: React.ReactNode }) => {
    const aeSdkRef = useRef<AeSdkAepp>();
    const staticAeSdkRef = useRef<AeSdk | null>(null);
    const [sdkInitialized, setSdkInitialized] = useState(false);
    const [activeAccount, setActiveAccount] = useAtom<string | undefined>(activeAccountAtom);
    const [accounts, setAccounts] = useState<string[]>([]);
    const [currentBlockHeight, setCurrentBlockHeight] = useState<number | null>(null);
    const [activeNetwork, setActiveNetwork] = useState<INetwork>(NETWORK_MAINNET);
    const [transactionsQueue, setTransactionsQueue] = useAtom(transactionsQueueAtom);
    const [walletInfo] = useAtom(walletInfoAtom);
    const transactionsQueueRef = useRef(transactionsQueue);
    const activeAccountRef = useRef<string | undefined>(activeAccount);
    const { openModal } = useModal();

    // Keep the refs in sync with the atom values
    useEffect(() => {
        transactionsQueueRef.current = transactionsQueue;
    }, [transactionsQueue]);

    useEffect(() => {
        const previousAccount = activeAccountRef.current;
        activeAccountRef.current = activeAccount;
        console.log("[AeSdkProvider] 📝 activeAccount state updated:", {
            timestamp: new Date().toISOString(),
            newActiveAccount: activeAccount,
            previousActiveAccount: previousAccount,
            changed: previousAccount !== activeAccount
        });
    }, [activeAccount]);

    // Poll for account changes when wallet is connected
    useEffect(() => {
        if (!sdkInitialized || !walletInfo || !aeSdkRef.current) {
            console.log("[AeSdkProvider] Polling skipped:", {
                sdkInitialized,
                hasWalletInfo: !!walletInfo,
                hasAeSdk: !!aeSdkRef.current
            });
            return;
        }

        console.log("[AeSdkProvider] Starting account change polling");

        const checkAccountChange = async () => {
            try {
                // Check the SDK's current account state
                const accountsCurrent = aeSdkRef.current?._accounts?.current || {};
                const currentAddress = Object.keys(accountsCurrent)[0] as string | undefined;
                
                // Only log and update if there's an actual change
                if (currentAddress && currentAddress !== activeAccountRef.current) {
                    console.log("[AeSdkProvider] 🔄 Poll detected account change:", {
                        from: activeAccountRef.current,
                        to: currentAddress,
                        timestamp: new Date().toISOString()
                    });
                    setActiveAccount(currentAddress);
                    setAccounts([currentAddress]);
                }
            } catch (error) {
                // Only log errors, not every poll check
                console.error("[AeSdkProvider] Error checking account change:", error);
            }
        };

        // Check immediately
        checkAccountChange();

        // Poll every 1 second for faster account change detection
        const interval = setInterval(checkAccountChange, 1000);

        return () => {
            console.log("[AeSdkProvider] Stopping account change polling");
            clearInterval(interval);
        };
    }, [sdkInitialized, walletInfo, setActiveAccount, setAccounts]);

    async function initSdk() {
        console.log("[AeSdkProvider] initSdk activeAccount", activeAccount);
        const _aeSdk = new AeSdkAepp({
            name: "Superhero",
            nodes,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            ttl: 10000,
            onCompiler: new CompilerHttp(NETWORK_MAINNET.compilerUrl),
            onAddressChange: (a: any) => {
                console.log("[AeSdkProvider] 🔔 onAddressChange callback triggered - FULL EVENT:", {
                    timestamp: new Date().toISOString(),
                    event: a,
                    eventType: typeof a,
                    eventKeys: a ? Object.keys(a) : [],
                    aCurrent: a?.current,
                    aCurrentType: typeof a?.current,
                    aCurrentKeys: a?.current ? Object.keys(a?.current) : [],
                    accountsInCurrent: a?.current ? Object.keys(a.current) : [],
                    stringified: JSON.stringify(a, null, 2)
                });
                
                const newAddress = Object.keys(a.current || {})[0] as any;
                
                console.log("[AeSdkProvider] 🔔 onAddressChange parsed:", {
                    newAddress,
                    currentActiveAccount: activeAccountRef.current,
                    willUpdate: newAddress && newAddress !== activeAccountRef.current
                });
                
                if (newAddress && newAddress !== activeAccountRef.current) {
                    console.log("[AeSdkProvider] ✅ onAddressChange - Updating account from", activeAccountRef.current, "to", newAddress);
                    console.log("[AeSdkProvider] 🔄 Calling setActiveAccount and setAccounts");
                    setActiveAccount(newAddress);
                    // Update accounts list
                    setAccounts([newAddress]);
                    // Force a small delay to ensure state updates propagate
                    setTimeout(() => {
                        console.log("[AeSdkProvider] ✅ onAddressChange update completed, new activeAccount:", newAddress);
                    }, 100);
                } else {
                    console.log("[AeSdkProvider] ⏭️ onAddressChange - Skipping update (same account or no address)");
                }
            },
            onDisconnect: () => {
                setActiveAccount(undefined);
                setAccounts([]);
            },
        });

        const _staticAeSdk = new AeSdk({
            nodes,
            onCompiler: new CompilerHttp(NETWORK_MAINNET.compilerUrl),
        });

        aeSdkRef.current = _aeSdk;
        staticAeSdkRef.current = _staticAeSdk;

        if (activeAccount) {
            addStaticAccount(activeAccount);
        }

        setInterval(async () => {
            getCurrentGeneration(_aeSdk);
        }, 30000);
        getCurrentGeneration(_aeSdk);
        setSdkInitialized(true);

        WebSocketClient.disconnect();
        WebSocketClient.connect(activeNetwork.websocketUrl);
    }

    function getCurrentGeneration(sdk?: AeSdkAepp) {
        (sdk || aeSdkRef.current).getCurrentGeneration().then((result) => {
            setCurrentBlockHeight(result.keyBlock.height);
        });
    }

    async function addStaticAccount(address: any) {
        // should wait till staticAeSdk is initialized
        await new Promise(resolve => {
            const interval = setInterval(() => {
                if (staticAeSdkRef.current) {
                    clearInterval(interval);
                    resolve(true);
                }
            }, 100);
        });

        setActiveAccount(address);
        staticAeSdkRef.current.addAccount(
            {
                address,
                signTransaction: function (
                    tx: Encoded.Transaction,
                ): Promise<Encoded.Transaction> {
                    const uniqueId = Math.random().toString(36).substring(7);
                    const currentUrl = new URL(window.location.href);
                    // reset url
                    currentUrl.searchParams.delete("transaction");
                    currentUrl.searchParams.delete("status");

                    const currentDomain = currentUrl.origin;

                    // append transaction parameter for success case
                    // const successUrl = new URL(currentUrl.href);
                    const successUrl = new URL(`${currentDomain}/tx-queue/${uniqueId}`);
                    successUrl.searchParams.set("transaction", "{transaction}");
                    successUrl.searchParams.set("status", "completed");

                    // append transaction parameter for failed case
                    const cancelUrl = new URL(`${currentDomain}/tx-queue/${uniqueId}`);
                    cancelUrl.searchParams.set("status", "cancelled");

                    const signUrl: any = createDeepLinkUrl({
                        type: "sign-transaction",
                        transaction: tx,
                        networkId: activeNetwork.networkId,
                        "replace-caller": "true",
                        // decode these urls because they will be encoded again
                        "x-success": decodeURI(successUrl.href),
                        "x-cancel": decodeURI(cancelUrl.href),
                    });

                    setTransactionsQueue({
                        ...transactionsQueue,
                        [uniqueId]: {
                            status: "pending",
                            tx,
                            signUrl,
                        }
                    });

                    return new Promise((resolve, reject) => {
                        let newWindow: Window | null = null;
                        const windowFeatures =
                            "name=Superhero Wallet,width=362,height=594,toolbar=false,location=false,menubar=false,popup";

                        openModal({
                            name: 'transaction-confirm',
                            props: {
                                transaction: tx,
                                onConfirm: () => {
                                    /**
                                     * By setting a name and width/height,
                                     * the extension is forced to open in a new window
                                     */
                                    newWindow = window.open(signUrl, "_blank", windowFeatures);
                                },
                                onCancel: () => {
                                    reject(new Error("Transaction cancelled"));
                                }
                            }
                        });

                        const interval = setInterval(() => {
                            const currentQueue = transactionsQueueRef.current;
                            if (Object.keys(currentQueue).includes(uniqueId)) {
                                if (currentQueue[uniqueId]?.status === "cancelled") {
                                    clearInterval(interval);
                                    reject(new Error("Transaction cancelled"));
                                    newWindow?.close();
                                    // delete transaction from queue
                                    const newQueue = { ...currentQueue };
                                    delete newQueue[uniqueId];
                                    setTransactionsQueue(newQueue);
                                }

                                if (
                                    currentQueue[uniqueId]?.status === "completed" &&
                                    currentQueue[uniqueId]?.transaction
                                ) {
                                    clearInterval(interval);
                                    resolve(currentQueue[uniqueId].transaction);
                                    newWindow?.close();
                                    // delete transaction from queue
                                    const newQueue = { ...currentQueue };
                                    delete newQueue[uniqueId];
                                    setTransactionsQueue(newQueue);
                                }
                            }
                        }, 500);
                    });
                },
            } as any,
            { select: true },
        );
    }

    async function scanForAccounts() {
        console.log("[AeSdkProvider] 🔍 scanForAccounts called");
        const accountsCurrent = aeSdkRef.current._accounts?.current || {};
        const currentAddress = Object.keys(accountsCurrent)[0] as any;

        console.log("[AeSdkProvider] scanForAccounts result:", {
            accountsCurrent: Object.keys(accountsCurrent),
            currentAddress,
            previousActiveAccount: activeAccountRef.current
        });

        setAccounts([currentAddress]);
        setActiveAccount(currentAddress);
    }

    // useEffect(() => {
    //     initSdk();
    // }, []);


    return (
        <AeSdkContext.Provider value={{
            aeSdk: aeSdkRef.current,
            staticAeSdk: staticAeSdkRef.current,
            sdkInitialized,
            activeAccount,
            currentBlockHeight,
            activeNetwork,
            accounts,
            setActiveAccount,
            setAccounts,
            getCurrentGeneration,
            addStaticAccount,
            setActiveNetwork,
            setTransactionsQueue,
            initSdk,
            scanForAccounts,
            nodes,
        }}>
            {children}
        </AeSdkContext.Provider>
    );
};