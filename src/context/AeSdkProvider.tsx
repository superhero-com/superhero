import WebSocketClient from '@/libs/WebSocketClient';
import { INLINE_WALLET_ENABLED } from '@/features/wallet/config';
import { createInlineSdkAccount } from '@/features/wallet/inline-sdk-account';
import { indexForAddress } from '@/features/wallet/manifest-store';
import { requestUnlock } from '@/features/wallet/unlock-broker';
import { createIndexedDbVaultStore } from '@/features/wallet/vault-store';
import { isStandalone } from '@/utils/displayMode';
import {
  AeSdk, AeSdkAepp, CompilerHttp, Contract, Encoded, Node,
} from '@aeternity/aepp-sdk';
import { useAtom } from 'jotai';
import {
  createContext,
  lazy,
  Suspense,
  useCallback,
  useEffect, useMemo, useRef, useState,
} from 'react';
import { activeAccountAtom } from '../atoms/accountAtoms';
import {
  TX_QUEUE_ACK_CHANNEL,
  TX_QUEUE_REQUEST_PREFIX,
  TX_QUEUE_RESULT_PREFIX,
  type MessageSignRequest,
  transactionsQueueAtom,
} from '../atoms/txQueueAtoms';
import { walletInfoAtom } from '../atoms/walletAtoms';
import { CONFIG } from '../config';
import { useModal } from '../hooks/useModal';
import { CURRENT_NETWORK, IS_MOBILE } from '../utils/constants';
import { safeLocalStringStorage } from '../utils/jotaiSafeLocalStorage';
import { INetwork } from '../utils/types';
import { createDeepLinkUrl, openDeepLink } from '../utils/url';

type TxQueueEntry = {
  status: string;
  signUrl: string;
  tx?: Encoded.Transaction;
  transaction?: Encoded.Transaction;
  message?: string;
  signature?: string;
};

type SignMessageOptions = {
  request?: MessageSignRequest;
};

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
  signMessage: (message: string, options?: SignMessageOptions) => Promise<string>,
  setActiveNetwork: (network: INetwork) => void,
  setTransactionsQueue: (queue: Record<string, TxQueueEntry>) => void,
  initSdk: () => void,
  scanForAccounts: () => Promise<string | undefined>,
  nodes: { instance: Node; name: string }[],
    }>(null);

const nodes: { instance: Node; name: string }[] = [
  {
    name: CURRENT_NETWORK.name,
    instance: new Node(CURRENT_NETWORK.url),
  },
];

type ContractInitializeOptions = Parameters<typeof Contract.initialize>[0];
type LegacyInitializableSdk = {
  getContext: () => Partial<ContractInitializeOptions>;
  initializeContract?: (
    options: ContractInitializeOptions,
  ) => ReturnType<typeof Contract.initialize>;
};

const ensureLegacyInitializeContract = (sdkInstance: LegacyInitializableSdk) => {
  if (typeof sdkInstance.initializeContract === 'function') return;
  Object.defineProperty(sdkInstance, 'initializeContract', {
    configurable: true,
    value: (options: ContractInitializeOptions) => Contract.initialize({
      ...sdkInstance.getContext(),
      ...options,
    }),
  });
};

const bytesToHex = (bytes: Uint8Array | number[]) => Array.from(bytes)
  .map((byte) => byte.toString(16).padStart(2, '0'))
  .join('');

/** Device vault for the inline wallet. Lazy per call — no IndexedDB is opened until a signature. */
const inlineVaultStore = createIndexedDbVaultStore();

/** Stand-in for the sign prompt while the flag is off. Never mounted. */
const NO_COMPONENT: React.ComponentType<any> = () => null;

/**
 * The in-page unlock + WYSIWYS confirmation surface the inline signer blocks on.
 * Lazy-loaded so its crypto stack never enters the main chunk, and rendered only
 * when `INLINE_WALLET_ENABLED` — with the flag off (production today) it is
 * never mounted and never fetched.
 *
 * The `lazy()` call sits INSIDE the flag ternary: unconditionally it is an opaque
 * call Rollup must keep, so the chunk was still EMITTED (and listed in
 * `__vite__mapDeps`) with the flag off. Behind the literal it folds away and no
 * chunk exists — enforced by `scripts/verify-no-wallet-chunks.cjs`.
 */
const WalletSignPrompt: React.ComponentType<any> = INLINE_WALLET_ENABLED
  ? lazy(() => import('@/features/wallet/components/WalletSignPrompt'))
  : NO_COMPONENT;

/**
 * Signer-factory swap point — build-plan.md §3.4 / §8 phase P4. Installs the
 * in-page inline signer instead of the delegated (`superhero://` deep-link +
 * `localStorage` poll + `BroadcastChannel`) relay, but ONLY when all three of
 * these hold:
 *
 *  1. `INLINE_WALLET_ENABLED` — a hard off-by-default literal const (see
 *     `features/wallet/config.ts`). False in production today, which alone makes
 *     this whole branch dead code for every real user.
 *  2. `isStandalone()` — the app is running as an installed PWA. This is a UX
 *     gate ONLY, never a security boundary: it is documented-spoofable, and
 *     under same-origin custody forcing the inline path in a plain browser tab
 *     changes nothing about the security story (build-plan §3.4).
 *  3. The address is a known inline account in the cleartext manifest. This is
 *     what keeps a user who connected an EXTERNAL wallet (extension,
 *     `wallet.superhero.com`, WalletConnect) on the delegated relay even inside
 *     the installed PWA — we must never claim to sign for a key we don't hold.
 *
 * Any of the three false → the existing delegated account object, completely
 * unchanged. Browser (non-standalone) mode is untouched in every case.
 *
 * The returned account signs in-page: user-verification + WYSIWYS confirm on
 * EVERY signature via `requestUnlock` (`unlock-broker.ts` → `WalletSignPrompt`),
 * then unseal → derive → sign → drop. No unlocked seed is cached between
 * signatures — see `inline-signer.ts`.
 *
 * Exported as a plain function (not a hook) so it can be unit-tested in
 * isolation from React lifecycle / SDK initialization.
 */
export const makeSigner = (
  address: string,
  createDelegatedAccount: (addr: string) => unknown,
  networkId?: string,
): unknown => {
  if (!(INLINE_WALLET_ENABLED && isStandalone())) return createDelegatedAccount(address);
  const index = indexForAddress(address);
  if (index === null) return createDelegatedAccount(address);
  return createInlineSdkAccount({
    address, index, store: inlineVaultStore, unlock: requestUnlock, networkId,
  });
};

const normalizeSignatureResult = (signature: any): string => {
  if (typeof signature === 'string') return signature;
  if (signature instanceof Uint8Array || Array.isArray(signature)) return bytesToHex(signature);
  if (typeof signature?.signature === 'string') return signature.signature;
  if (signature?.signature instanceof Uint8Array || Array.isArray(signature?.signature)) {
    return bytesToHex(signature.signature);
  }
  throw new Error('Wallet did not return a valid signature');
};

export const AeSdkProvider = ({ children }: { children: React.ReactNode }) => {
  const aeSdkRef = useRef<AeSdkAepp>();
  const staticAeSdkRef = useRef<AeSdk | null>(null);
  const [sdkInitialized, setSdkInitialized] = useState(false);
  const [activeAccount, setActiveAccount] = useAtom(activeAccountAtom);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [currentBlockHeight, setCurrentBlockHeight] = useState<number | null>(null);
  const [activeNetwork, setActiveNetwork] = useState<INetwork>(CURRENT_NETWORK);
  const [transactionsQueue, setTransactionsQueue] = useAtom(transactionsQueueAtom);
  const [walletInfo, setWalletInfo] = useAtom(walletInfoAtom);
  const transactionsQueueRef = useRef(transactionsQueue);
  const activeAccountRef = useRef<string | undefined>(activeAccount);
  const walletInfoRef = useRef<typeof walletInfo>(walletInfo);
  const generationPollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { openModal } = useModal();

  // Keep the refs in sync with the atom values
  useEffect(() => {
    transactionsQueueRef.current = transactionsQueue;
  }, [transactionsQueue]);

  useEffect(() => {
    activeAccountRef.current = activeAccount;
  }, [activeAccount]);
  useEffect(() => {
    walletInfoRef.current = walletInfo;
  }, [walletInfo]);

  // Cleanup generation polling interval on unmount
  useEffect(() => () => {
    if (generationPollIntervalRef.current) {
      clearInterval(generationPollIntervalRef.current);
    }
  }, []);

  const getCurrentGeneration = useCallback((sdk?: AeSdkAepp) => {
    const targetSdk = sdk || aeSdkRef.current;
    if (!targetSdk) return;
    targetSdk.getCurrentGeneration().then((result) => {
      setCurrentBlockHeight(result.keyBlock.height);
    });
  }, [aeSdkRef]);

  const signMessage = useCallback(async (
    message: string,
    options?: SignMessageOptions,
  ): Promise<string> => {
    const signer = aeSdkRef.current as any;
    if (typeof signer?.signMessage === 'function') {
      try {
        return normalizeSignatureResult(await signer.signMessage(message));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error || '');
        if (!/not connected|not.*wallet|wallet.*not|no.*wallet/i.test(errorMessage)) {
          throw error;
        }
      }
    }

    const uniqueId = Math.random().toString(36).substring(7);
    const currentDomain = new URL(window.location.href).origin;
    const successUrl = new URL(`${currentDomain}/tx-queue/${uniqueId}`);
    successUrl.searchParams.set('signature', '{signature}');
    successUrl.searchParams.set('status', 'completed');
    const cancelUrl = new URL(`${currentDomain}/tx-queue/${uniqueId}`);
    cancelUrl.searchParams.set('status', 'cancelled');

    const signUrl = createDeepLinkUrl({
      type: 'sign-message',
      message,
      'x-success': decodeURI(successUrl.href),
      'x-cancel': decodeURI(cancelUrl.href),
    });

    setTransactionsQueue((prev) => ({
      ...prev,
      [uniqueId]: {
        status: 'pending',
        message,
        signUrl,
      },
    }));

    return new Promise((resolve, reject) => {
      const ackChannel = typeof BroadcastChannel !== 'undefined'
        ? new BroadcastChannel(TX_QUEUE_ACK_CHANNEL)
        : null;
      const storedResultKey = `${TX_QUEUE_RESULT_PREFIX}${uniqueId}`;
      const storedRequestKey = `${TX_QUEUE_REQUEST_PREFIX}${uniqueId}`;
      if (options?.request) {
        safeLocalStringStorage.setItem(storedRequestKey, JSON.stringify(options.request));
      }
      const windowFeatures = [
        'name=Superhero Wallet',
        'width=362',
        'height=594',
        'toolbar=false',
        'location=false',
        'menubar=false',
        'popup',
      ].join(',');

      let interval: NodeJS.Timeout | null = null;
      let timeout: NodeJS.Timeout | null = null;
      let newWindow: Window | null = openDeepLink({
        type: 'sign-message',
        message,
        'x-success': decodeURI(successUrl.href),
        'x-cancel': decodeURI(cancelUrl.href),
        target: '_blank',
        windowFeatures,
      });
      let isCleanedUp = false;

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
        if (newWindow) {
          newWindow.close();
          newWindow = null;
        }
        ackChannel?.close();
      };

      const MAX_POLL_TIME = 5 * 60 * 1000;
      timeout = setTimeout(() => {
        safeLocalStringStorage.removeItem(storedResultKey);
        safeLocalStringStorage.removeItem(storedRequestKey);
        cleanup();
        reject(new Error('Message signing timeout'));
      }, MAX_POLL_TIME);

      interval = setInterval(() => {
        const currentQueue = transactionsQueueRef.current;
        const storedResult = safeLocalStringStorage.getItem(storedResultKey);
        let parsedStoredResult: any = null;
        try {
          parsedStoredResult = storedResult ? JSON.parse(storedResult) : null;
        } catch {
          safeLocalStringStorage.removeItem(storedResultKey);
        }
        const queueEntry = currentQueue[uniqueId] || parsedStoredResult;
        if (!queueEntry) return;

        if (queueEntry.status === 'cancelled') {
          ackChannel?.postMessage({ id: uniqueId, status: 'cancelled' });
          safeLocalStringStorage.removeItem(storedResultKey);
          safeLocalStringStorage.removeItem(storedRequestKey);
          cleanup();
          const newQueue = { ...currentQueue };
          delete newQueue[uniqueId];
          setTransactionsQueue(newQueue);
          reject(new Error('Message signing cancelled'));
          return;
        }

        if (queueEntry.status === 'completed') {
          const signature = queueEntry.signature?.trim();
          ackChannel?.postMessage({ id: uniqueId, status: 'completed' });
          safeLocalStringStorage.removeItem(storedResultKey);
          safeLocalStringStorage.removeItem(storedRequestKey);
          cleanup();
          const newQueue = { ...currentQueue };
          delete newQueue[uniqueId];
          setTransactionsQueue(newQueue);
          if (!signature) {
            reject(new Error('Wallet did not return a signature'));
            return;
          }
          resolve(signature);
        }
      }, 500);
    });
  }, [setTransactionsQueue]);

  /**
   * Builds the existing delegated (deep-link + relay) signing account object —
   * UNCHANGED behavior, only extracted into its own callback so `makeSigner`
   * (see above) can choose between this and the inline in-page signer without
   * altering this logic.
   */
  const createDelegatedSignerAccount = useCallback((address: string) => ({
    address,
    signTransaction(
      tx: Encoded.Transaction,
      options?: { innerTx?: boolean },
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
        innerTx: options?.innerTx === true ? 'true' : undefined,
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
        const ackChannel = typeof BroadcastChannel !== 'undefined'
          ? new BroadcastChannel(TX_QUEUE_ACK_CHANNEL)
          : null;
        const windowFeatures = [
          'name=Superhero Wallet',
          'width=362',
          'height=594',
          'toolbar=false',
          'location=false',
          'menubar=false',
          'popup',
        ].join(',');

        let interval: NodeJS.Timeout | null = null;
        let timeout: NodeJS.Timeout | null = null;
        let isCleanedUp = false;
        let unloadHandler: (() => void) | null = null;
        const storedResultKey = `${TX_QUEUE_RESULT_PREFIX}${uniqueId}`;

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
          ackChannel?.close();
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
              newWindow = openDeepLink({
                type: 'sign-transaction',
                transaction: tx,
                networkId: activeNetwork.networkId,
                innerTx: options?.innerTx === true ? 'true' : undefined,
                'replace-caller': 'true',
                'x-success': decodeURI(successUrl.href),
                'x-cancel': decodeURI(cancelUrl.href),
                target: '_blank',
                windowFeatures,
              });
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
          safeLocalStringStorage.removeItem(storedResultKey);
          cleanup();
          reject(new Error('Transaction polling timeout'));
        }, MAX_POLL_TIME);

        // Handle page unload to cleanup interval
        if (typeof window !== 'undefined' && !IS_MOBILE) {
          unloadHandler = () => {
            cleanup();
          };
          window.addEventListener('beforeunload', unloadHandler);
        }

        interval = setInterval(() => {
          const currentQueue = transactionsQueueRef.current;
          const storedResult = safeLocalStringStorage.getItem(storedResultKey);
          let parsedStoredResult: any = null;
          try {
            parsedStoredResult = storedResult ? JSON.parse(storedResult) : null;
          } catch {
            safeLocalStringStorage.removeItem(storedResultKey);
          }
          const queueEntry = currentQueue[uniqueId] || parsedStoredResult;

          if (queueEntry) {
            if (queueEntry.status === 'cancelled') {
              ackChannel?.postMessage({ id: uniqueId, status: 'cancelled' });
              safeLocalStringStorage.removeItem(storedResultKey);
              cleanup();
              reject(new Error('Transaction cancelled'));
              // delete transaction from queue
              const newQueue = { ...currentQueue };
              delete newQueue[uniqueId];
              setTransactionsQueue(newQueue);
              return;
            }

            if (
              queueEntry.status === 'completed'
            ) {
              const signedTx = queueEntry.transaction;
              if (!signedTx || typeof signedTx !== 'string' || !signedTx.startsWith('tx_')) {
                safeLocalStringStorage.removeItem(storedResultKey);
                cleanup();
                // delete transaction from queue
                const newQueue = { ...currentQueue };
                delete newQueue[uniqueId];
                setTransactionsQueue(newQueue);
                reject(new Error('Wallet did not return a signed transaction'));
                return;
              }
              ackChannel?.postMessage({ id: uniqueId, status: 'completed' });
              safeLocalStringStorage.removeItem(storedResultKey);
              cleanup();
              resolve(signedTx as Encoded.Transaction);
              // delete transaction from queue
              const newQueue = { ...currentQueue };
              delete newQueue[uniqueId];
              setTransactionsQueue(newQueue);
            }
          }
        }, 500);
      });
    },
    signMessage,
  } as any), [activeNetwork.networkId, setTransactionsQueue, openModal, signMessage]);

  const addStaticAccount = useCallback(async (address: string) => {
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
      makeSigner(address, createDelegatedSignerAccount, activeNetwork.networkId) as any,
      { select: true },
    );
  }, [setActiveAccount, createDelegatedSignerAccount, activeNetwork.networkId]);

  const initSdk = useCallback(async () => {
    // Prevent re-initialization if already initialized
    if (sdkInitialized && aeSdkRef.current && staticAeSdkRef.current) {
      return;
    }

    const aeSdkInstance = new AeSdkAepp({
      name: 'Superhero',
      nodes,
      ttl: 10000,
      onCompiler: new CompilerHttp(CURRENT_NETWORK.compilerUrl),
      onAddressChange: (a: any) => {
        const newAddress = Object.keys(a.current || {})[0] as any;

        // Only update if there's an actual change
        if (newAddress && newAddress !== activeAccountRef.current) {
          setActiveAccount(newAddress);
          setAccounts([newAddress]);
        }
      },
      onDisconnect: () => {
        // Clear persisted wallet state to prevent auto-reconnect attempts with stale data
        setWalletInfo(undefined);
        setActiveAccount(undefined);
        setAccounts([]);
      },
    });

    const staticAeSdkInstance = new AeSdk({
      ttl: 10000,
      nodes,
      onCompiler: new CompilerHttp(CURRENT_NETWORK.compilerUrl),
    });

    // TODO:Remove this once libraries are updated to use the new Contract.initialize method
    // Compatibility shim for libraries still calling sdk.initializeContract
    // (removed in aepp-sdk v14).
    ensureLegacyInitializeContract(aeSdkInstance as unknown as LegacyInitializableSdk);
    ensureLegacyInitializeContract(staticAeSdkInstance as unknown as LegacyInitializableSdk);

    aeSdkRef.current = aeSdkInstance;
    staticAeSdkRef.current = staticAeSdkInstance;

    // If there's a persisted active account, add it as static (read-only) account
    if (activeAccount) {
      await addStaticAccount(activeAccount);
    }

    // Clear any existing interval before creating a new one
    if (generationPollIntervalRef.current) {
      clearInterval(generationPollIntervalRef.current);
    }

    // Poll for current block height every 30 seconds
    generationPollIntervalRef.current = setInterval(() => {
      getCurrentGeneration(aeSdkInstance);
    }, 30000);

    // Get initial block height
    getCurrentGeneration(aeSdkInstance);

    setSdkInitialized(true);

    // Connect to WebSocket for real-time updates (empty URL would make socket.io use page origin)
    WebSocketClient.disconnect();
    WebSocketClient.connect(
      activeNetwork.websocketUrl || CONFIG.BACKEND_URL,
    );
  }, [
    sdkInitialized,
    activeAccount,
    getCurrentGeneration,
    activeNetwork.websocketUrl,
    setActiveAccount,
    setWalletInfo,
    addStaticAccount,
  ]);

  const scanForAccounts = useCallback(async () => {
    // eslint-disable-next-line no-underscore-dangle
    const accountsCurrent = aeSdkRef.current?._accounts?.current || {};
    const currentAddress = Object.keys(accountsCurrent)[0] as any;

    setAccounts(currentAddress ? [currentAddress] : []);
    setActiveAccount(currentAddress);
    return currentAddress as string | undefined;
  }, [setAccounts, setActiveAccount]);

  const contextValue = useMemo(() => ({
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
    signMessage,
    setActiveNetwork,
    setTransactionsQueue,
    initSdk,
    scanForAccounts,
    nodes,
  }), [
    sdkInitialized,
    activeAccount,
    currentBlockHeight,
    activeNetwork,
    accounts,
    getCurrentGeneration,
    initSdk,
    scanForAccounts,
    signMessage,
    setActiveAccount,
    setAccounts,
    addStaticAccount,
    setActiveNetwork,
    setTransactionsQueue,
  ]);

  return (
    <AeSdkContext.Provider value={contextValue}>
      {children}
      {/* Mounted app-wide (not inside a wallet screen) because a signature can be
          requested from anywhere; the signer fails closed if it is absent. */}
      {INLINE_WALLET_ENABLED && (
        <Suspense fallback={null}>
          <WalletSignPrompt />
        </Suspense>
      )}
    </AeSdkContext.Provider>
  );
};
