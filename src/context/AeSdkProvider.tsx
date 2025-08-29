import { AeSdk, AeSdkAepp, CompilerHttp, Encoded, Node } from "@aeternity/aepp-sdk";
import { useAtom } from "jotai";
import { createContext, useEffect, useState } from "react";
import { activeAccountAtom } from "../atoms/accountAtoms";
import configs from "../configs";
import { NETWORK_MAINNET } from "../utils/constants";
import { INetwork } from "../utils/types";
import { createDeepLinkUrl } from "../utils/url";

export const AeSdkContext = createContext<{
    sdk: AeSdkAepp,
    staticAeSdk: AeSdk,
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
}>(null);

const nodes: { instance: Node; name: string }[] = Object.values(
    configs.networks,
).map(({ name, url }) => ({
    name,
    instance: new Node(url),
}));

export const AeSdkProvider = ({ children }: { children: React.ReactNode }) => {
    const [aeSdk, setAeSdk] = useState<AeSdkAepp>();
    const [staticAeSdk, setStaticAeSdk] = useState<AeSdk | null>(null);
    const [activeAccount, setActiveAccount] = useAtom<string | undefined>(activeAccountAtom);
    const [accounts, setAccounts] = useState<string[]>([]);
    const [currentBlockHeight, setCurrentBlockHeight] = useState<number | null>(null);
    const [activeNetwork, setActiveNetwork] = useState<INetwork | null>(null);
    // TODO: should be an atom
    const [transactionsQueue, setTransactionsQueue] = useState<Record<string, { status: string; tx: Encoded.Transaction; signUrl: string }>>({});

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
                setActiveAccount(Object.keys(a.current || {})[0] as any);
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

        setAeSdk(_aeSdk);
        setStaticAeSdk(_staticAeSdk);

        if (activeAccount) {
            addStaticAccount(activeAccount);
        }

        setInterval(async () => {
            getCurrentGeneration(_aeSdk);
        }, 30000);
        getCurrentGeneration(_aeSdk);
    }

    function getCurrentGeneration(sdk?: AeSdkAepp) {
        (sdk || aeSdk).getCurrentGeneration().then((result) => {
            setCurrentBlockHeight(result.keyBlock.height);
        });
    }

    async function addStaticAccount(address: any) {
        // should wait till staticAeSdk is initialized
        await new Promise(resolve => {
            const interval = setInterval(() => {
                if (staticAeSdk) {
                    clearInterval(interval);
                    resolve(true);
                }
            }, 100);
        });

        setActiveAccount(address);
        staticAeSdk.addAccount(
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

                    transactionsQueue.value[uniqueId] = {
                        status: "pending",
                        tx,
                        signUrl,
                    };

                    return new Promise((resolve, reject) => {
                        let newWindow: Window | null = null;
                        const windowFeatures =
                            "name=Superhero Wallet,width=362,height=594,toolbar=false,location=false,menubar=false,popup";

                        alert("TODO: should open a modal to confirm the transaction");
                        // transactionConfirmModal.openModal().then((confirmed: boolean) => {
                        //     if (confirmed) {
                        //         /**
                        //          * By setting a name and width/height,
                        //          * the extension is forced to open in a new window
                        //          */
                        //         newWindow = window.open(signUrl, "_blank", windowFeatures);
                        //     } else {
                        //         reject(new Error("Transaction cancelled"));
                        //     }
                        // });

                        const interval = setInterval(() => {
                            if (Object.keys(transactionsQueue.value).includes(uniqueId)) {
                                if (transactionsQueue.value[uniqueId]?.status === "cancelled") {
                                    clearInterval(interval);
                                    reject(new Error("Transaction cancelled"));
                                    newWindow?.close();
                                    // delete transaction from queue
                                    delete transactionsQueue.value[uniqueId];
                                }

                                if (
                                    transactionsQueue.value[uniqueId]?.status === "completed" &&
                                    transactionsQueue.value[uniqueId]?.transaction
                                ) {
                                    clearInterval(interval);
                                    resolve(transactionsQueue.value[uniqueId].transaction);
                                    newWindow?.close();
                                    // delete transaction from queue
                                    delete transactionsQueue.value[uniqueId];
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
        const currentAddress = Object.keys(
            aeSdk._accounts?.current || {},
        )[0] as any;

        setAccounts([currentAddress]);

        setActiveAccount(currentAddress);
    }

    useEffect(() => {
        initSdk();
    }, []);

    if (!aeSdk && !staticAeSdk) {
        return null;
    }

    return (
        <AeSdkContext.Provider value={{
            sdk: aeSdk,
            staticAeSdk,
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
        }}>
            {children}
        </AeSdkContext.Provider>
    );
};