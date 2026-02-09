import {
  AeSdk, AeSdkAepp, CompilerHttp, Encoded, Node,
} from '@aeternity/aepp-sdk';
import { useAtom } from 'jotai';
import {
  createContext, useEffect, useRef, useState,
} from 'react';
import WebSocketClient from '@/libs/WebSocketClient';
import { activeAccountAtom } from '../atoms/accountAtoms';
import { transactionsQueueAtom } from '../atoms/txQueueAtoms';
import { walletInfoAtom } from '../atoms/walletAtoms';
import { useModal } from '../hooks/useModal';
import configs from '../configs';
import { NETWORK_MAINNET } from '../utils/constants';
import { INetwork } from '../utils/types';
import { createDeepLinkUrl } from '../utils/url';

export const AeSdkContext = createContext<{
    aeSdk: AeSdkAepp,
    staticAeSdk: AeSdk,
    sdkInitialized: boolean,
    activeAccount: string,
    currentBlockHeight: number,
    activeNetwork: INetwork,
    accounts: string[],
    setActiveAccount:(account: string) => void,
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
  const [walletInfo, setWalletInfo] = useAtom(walletInfoAtom);
  const transactionsQueueRef = useRef(transactionsQueue);
  const activeAccountRef = useRef<string | undefined>(activeAccount);
  const generationPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { openModal } = useModal();

  // Keep the refs in sync with the atom values
  useEffect(() => {
    transactionsQueueRef.current = transactionsQueue;
  }, [transactionsQueue]);

  useEffect(() => {
    activeAccountRef.current = activeAccount;
  }, [activeAccount]);

  // Cleanup generation polling interval on unmount
  useEffect(() => () => {
    if (generationPollIntervalRef.current) {
      clearInterval(generationPollIntervalRef.current);
    }
  }, []);

  // Poll for account changes when wallet is connected
  useEffect(() => {
    if (!sdkInitialized || !walletInfo || !aeSdkRef.current) {
      return;
    }

    const checkAccountChange = async () => {
      try {
        // Check the SDK's current account state
        const accountsCurrent = aeSdkRef.current?._accounts?.current || {};
        const currentAddress = Object.keys(accountsCurrent)[0] as string | undefined;

        // Update if there's an actual change
        if (currentAddress && currentAddress !== activeAccountRef.current) {
          setActiveAccount(currentAddress);
          setAccounts([currentAddress]);
        }
      } catch (error) {
        // Silently handle errors (wallet might be disconnected)
      }
    };

    // Check immediately
    checkAccountChange();

    // Poll every 1 second for faster account change detection
    const interval = setInterval(checkAccountChange, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [sdkInitialized, walletInfo, setActiveAccount, setAccounts]);

  async function initSdk() {
    const _aeSdk = new AeSdkAepp({
      name: 'Superhero',
      nodes,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      ttl: 10000,
      onCompiler: new CompilerHttp(NETWORK_MAINNET.compilerUrl),
      onAddressChange: (a: any) => {
        const newAddress = Object.keys(a.current || {})[0] as any;

        if (newAddress && newAddress !== activeAccountRef.current) {
          setActiveAccount(newAddress);
          setAccounts([newAddress]);
        }
      },
      onDisconnect: () => {
        // walletInfoAtom is persisted; clear it so polling can't "resurrect" connection state after disconnect
        setWalletInfo(undefined);
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

    // Clear any existing interval before creating a new one
    if (generationPollIntervalRef.current) {
      clearInterval(generationPollIntervalRef.current);
    }

    // Poll for current generation every 30 seconds
    generationPollIntervalRef.current = setInterval(async () => {
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
    await new Promise((resolve) => {
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
              signTransaction(
                tx: Encoded.Transaction,
              ): Promise<Encoded.Transaction> {
                const uniqueId = Math.random().toString(36).substring(7);
                const currentUrl = new URL(window.location.href);
                // reset url
                currentUrl.searchParams.delete('transaction');
                currentUrl.searchParams.delete('status');

                const currentDomain = currentUrl.origin;

                // append transaction parameter for success case
                // const successUrl = new URL(currentUrl.href);
                const successUrl = new URL(`${currentDomain}/tx-queue/${uniqueId}`);
                successUrl.searchParams.set('transaction', '{transaction}');
                successUrl.searchParams.set('status', 'completed');

                // append transaction parameter for failed case
                const cancelUrl = new URL(`${currentDomain}/tx-queue/${uniqueId}`);
                cancelUrl.searchParams.set('status', 'cancelled');

                const signUrl: any = createDeepLinkUrl({
                  type: 'sign-transaction',
                  transaction: tx,
                  networkId: activeNetwork.networkId,
                  'replace-caller': 'true',
                  // decode these urls because they will be encoded again
                  'x-success': decodeURI(successUrl.href),
                  'x-cancel': decodeURI(cancelUrl.href),
                });

                setTransactionsQueue((prev) => ({
                  ...prev,
                  [uniqueId]: {
                    status: 'pending',
                    tx,
                    signUrl,
                  },
                }));

                return new Promise((resolve, reject) => {
                  let newWindow: Window | null = null;
                  const windowFeatures = 'name=Superhero Wallet,width=362,height=594,toolbar=false,location=false,menubar=false,popup';

                  let interval: NodeJS.Timeout | null = null;
                  let timeout: NodeJS.Timeout | null = null;
                  let isCleanedUp = false;
                  let unloadHandler: (() => void) | null = null;

                  // Cleanup function to prevent memory leaks
                  const cleanup = () => {
                    if (isCleanedUp) return;
                    isCleanedUp = true;

                    if (interval) {
                      clearInterval(interval);
                      interval = null;
                    }
                    if (timeout) {
                      clearTimeout(timeout);
                      timeout = null;
                    }
                    if (unloadHandler && typeof window !== 'undefined') {
                      window.removeEventListener('beforeunload', unloadHandler);
                      unloadHandler = null;
                    }
                    if (newWindow) {
                      newWindow.close();
                      newWindow = null;
                    }
                  };

                  openModal({
                    name: 'transaction-confirm',
                    props: {
                      transaction: tx,
                      onConfirm: () => {
                        /**
                                     * By setting a name and width/height,
                                     * the extension is forced to open in a new window
                                     */
                        newWindow = window.open(signUrl, '_blank', windowFeatures);
                      },
                      onCancel: () => {
                        cleanup();
                        // Remove transaction from queue
                        const currentQueue = transactionsQueueRef.current;
                        if (Object.keys(currentQueue).includes(uniqueId)) {
                          const newQueue = { ...currentQueue };
                          delete newQueue[uniqueId];
                          setTransactionsQueue(newQueue);
                        }
                        reject(new Error('Transaction cancelled'));
                      },
                    },
                  });

                  // Set a timeout to prevent infinite polling (5 minutes max)
                  const MAX_POLL_TIME = 5 * 60 * 1000; // 5 minutes
                  timeout = setTimeout(() => {
                    cleanup();
                    reject(new Error('Transaction polling timeout'));
                  }, MAX_POLL_TIME);

                  // Handle page unload to cleanup interval
                  if (typeof window !== 'undefined') {
                    unloadHandler = () => {
                      cleanup();
                    };
                    window.addEventListener('beforeunload', unloadHandler);
                  }

                  interval = setInterval(() => {
                    const currentQueue = transactionsQueueRef.current;
                    if (Object.keys(currentQueue).includes(uniqueId)) {
                      if (currentQueue[uniqueId]?.status === 'cancelled') {
                        cleanup();
                        reject(new Error('Transaction cancelled'));
                        // delete transaction from queue
                        const newQueue = { ...currentQueue };
                        delete newQueue[uniqueId];
                        setTransactionsQueue(newQueue);
                        return;
                      }

                      if (
                        currentQueue[uniqueId]?.status === 'completed'
                                    && currentQueue[uniqueId]?.transaction
                      ) {
                        cleanup();
                        resolve(currentQueue[uniqueId].transaction);
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
    const accountsCurrent = aeSdkRef.current._accounts?.current || {};
    const currentAddress = Object.keys(accountsCurrent)[0] as any;

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
    }}
    >
      {children}
    </AeSdkContext.Provider>
  );
};
