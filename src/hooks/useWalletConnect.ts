/* eslint-disable no-use-before-define */
import {
  BrowserWindowMessageConnection,
  walletDetector,
} from '@aeternity/aepp-sdk';
import { useAtom } from 'jotai';
import {
  useCallback,
  useEffect, useRef,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { WalletInfo } from 'node_modules/@aeternity/aepp-sdk/es/aepp-wallet-communication/rpc/types';
import {
  CURRENT_NETWORK,
  IS_FRAMED_AEPP,
  IS_MOBILE,
  IS_SAFARI,
} from '../utils/constants';
import { useAeSdk } from './useAeSdk';
import { openDeepLink } from '../utils/url';
import { validateHash } from '../utils/address';
import type { Wallet, Wallets } from '../utils/types';
import {
  walletInfoAtom,
  walletConnectedAtom,
  connectingWalletAtom,
  scanningForAccountsAtom,
} from '../atoms/walletAtoms';

export function useWalletConnect() {
  const wallet = useRef<Wallet | undefined>(undefined);
  const scanStopRef = useRef<null |(() => void)>(null);
  const scanConnectionRef = useRef<BrowserWindowMessageConnection | null>(null);
  const scanPromiseRef = useRef<Promise<Wallet | undefined> | null>(null);
  const reconnectionAttemptedRef = useRef(false);
  const connectOperationRef = useRef<Promise<void | null> | null>(null);

  const [walletInfo, setWalletInfo] = useAtom<WalletInfo | undefined>(walletInfoAtom);
  const [scanningForAccounts, setScanningForAccounts] = useAtom(scanningForAccountsAtom);
  const [connectingWallet, setConnectingWallet] = useAtom(connectingWalletAtom);
  const [walletConnected, setWalletConnected] = useAtom(walletConnectedAtom);

  const location = useLocation();
  const navigate = useNavigate();
  const {
    aeSdk, scanForAccounts, addStaticAccount, setActiveAccount, setAccounts, activeAccount,
  } = useAeSdk();
  const activeAccountRef = useRef(activeAccount);
  const walletInfoRef = useRef(walletInfo);
  const walletConnectedRef = useRef(walletConnected);
  const connectingWalletRef = useRef(connectingWallet);
  const connectWalletRef = useRef<(() => Promise<void | null>) | null>(null);

  // Use only the current build network (mainnet or testnet; VITE_NETWORK)
  const availableNetworks = [CURRENT_NETWORK];

  // React equivalent of Vue watch for route query parameters
  useEffect(() => {
    async function checkAddressWalletConnection() {
      const query = Object.fromEntries(new URLSearchParams(location.search).entries());
      const hasAddressQuery = Boolean(query.address);

      if (query.address && !activeAccount) {
        const address = query.address as string;
        const addressValidation = validateHash(address);

        if (!addressValidation.valid) {
          navigate({ search: '' });
          return;
        }

        await addStaticAccount(address);
      }
      // Always consume this query param so future disconnects don't
      // auto-restore a static account from stale URL state.
      if (hasAddressQuery) navigate({ search: '' });
    }
    checkAddressWalletConnection();
  }, [activeAccount, addStaticAccount, location.search, navigate]);

  // Cleanup any pending wallet detection when this hook's owner unmounts
  useEffect(() => () => {
    try {
      scanStopRef.current?.();
    } catch {
      // ignore
    } finally {
      scanStopRef.current = null;
    }
    try {
      scanConnectionRef.current?.disconnect?.();
    } catch {
      // ignore
    } finally {
      scanConnectionRef.current = null;
    }
  }, []);

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
            // Runtime expects the string values ('subscribe'/'unsubscribe');
            // using the SDK const-enum breaks with TS isolatedModules.
            'subscribe' as any,
            'connected',
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
    openDeepLink({
      type: 'address',
      'x-success': `${window.location.href.split('?')[0]
      }?address={address}&networkId={networkId}`,
      'x-cancel': window.location.href.split('?')[0],
    });
  }

  // eslint-disable-next-line consistent-return
  async function connectWallet() {
    if (connectOperationRef.current) return connectOperationRef.current;
    const run = (async () => {
    // when trying to connect to the wallet all states should be reset
    // and sdk should be disconnected
    setWalletConnected(false);
    setWalletInfo(undefined);
    setActiveAccount(undefined);
    setAccounts([]);

    try {
      await aeSdk.disconnectWallet();
    } catch {
      // It's valid to have no previous wallet session on first connect attempt.
    }

    setConnectingWallet(true);
    wallet.current ??= await scanForWallets();

    if (!wallet.current) {
      setConnectingWallet(false);
      return !IS_FRAMED_AEPP ? deepLinkWalletConnect() : null;
    }

    try {
      const newWalletInfo = await aeSdk.connectToWallet(wallet.current.getConnection());
      setWalletInfo(newWalletInfo);

      await subscribeAddress();
      setWalletConnected(true);
    } catch {
      disconnectWallet();
    }
    setConnectingWallet(false);
    return null;
    })();
    connectOperationRef.current = run;
    try {
      return await run;
    } finally {
      connectOperationRef.current = null;
    }
  }
  connectWalletRef.current = connectWallet;

  useEffect(() => {
    activeAccountRef.current = activeAccount;
  }, [activeAccount]);

  useEffect(() => {
    walletInfoRef.current = walletInfo;
  }, [walletInfo]);

  useEffect(() => {
    walletConnectedRef.current = walletConnected;
  }, [walletConnected]);

  useEffect(() => {
    connectingWalletRef.current = connectingWallet;
  }, [connectingWallet]);

  async function disconnectWallet() {
    // Hard-clear persisted wallet session first to avoid instant reconnect on refresh.
    try {
      localStorage.removeItem('account:activeAccount');
      localStorage.removeItem('wallet:walletInfo');
    } catch {
      // ignore storage errors
    }
    // Stop any in-flight wallet detection and close message connection to prevent auto-reconnect.
    try {
      scanStopRef.current?.();
    } catch {
      // ignore
    } finally {
      scanStopRef.current = null;
    }
    try {
      scanConnectionRef.current?.disconnect?.();
    } catch {
      // ignore
    } finally {
      scanConnectionRef.current = null;
    }
    scanPromiseRef.current = null;
    // Drop cached wallet so we can't reconnect using a stale connection.
    wallet.current = undefined;

    setWalletInfo(undefined);

    setWalletConnected(false);
    setActiveAccount(undefined);
    setAccounts([]);
    try {
      await aeSdk.disconnectWallet();
    } catch {
      //
    }
  }

  /**
   * Scan for wallets
   */
  async function scanForWallets(): Promise<Wallet | undefined> {
    // Concurrency guard: reuse the in-flight scan rather than starting a duplicate.
    if (scanPromiseRef.current) return scanPromiseRef.current;

    const promise = new Promise<Wallet | undefined>((resolve) => {
      const scannerConnection = new BrowserWindowMessageConnection();
      scanConnectionRef.current = scannerConnection;

      // stopScan is assigned synchronously below; both async callbacks only fire
      // after the current tick, so stopScan is always initialised by then.
      let stopScan: (() => void) | undefined;

      const cleanup = () => {
        try { stopScan?.(); } catch { /* ignore */ }
        try { scannerConnection.disconnect?.(); } catch { /* ignore */ }
        scanStopRef.current = null;
        scanConnectionRef.current = null;
        scanPromiseRef.current = null;
      };

      const $walletConnectTimeout = setTimeout(
        () => {
          cleanup();
          resolve(undefined);
        },
        (IS_MOBILE || IS_SAFARI) && !IS_FRAMED_AEPP ? 100 : 2000,
      );

      const handleWallets = async ({
        newWallet,
      }: {
        newWallet?: Wallet | undefined;
        wallets: Wallets;
      }) => {
        clearTimeout($walletConnectTimeout);
        cleanup();
        resolve(newWallet);
      };

      stopScan = walletDetector(scannerConnection, handleWallets);
      scanStopRef.current = stopScan;
    });

    scanPromiseRef.current = promise;
    return promise;
  }

  /**
   * Attempt to reconnect using persisted wallet state.
   * This is called once on app initialization to restore previous wallet connection.
   */
  const attemptReconnection = useCallback(async () => {
    // Prevent multiple reconnection attempts
    if (reconnectionAttemptedRef.current) {
      return;
    }
    reconnectionAttemptedRef.current = true;

    // Guard against concurrent operations
    if (connectingWalletRef.current || walletConnectedRef.current) {
      return;
    }

    if (
      // route.name !== "tx-queue" &&
      activeAccountRef.current
      && !walletConnectedRef.current
    ) {
      if (walletInfoRef.current) {
        await connectWalletRef.current?.();
      }
    }
  }, []);

  const reconnectWalletSession = useCallback(async (expectedAddress?: string) => {
    if (connectingWalletRef.current) return false;
    if (walletConnectedRef.current && activeAccountRef.current) {
      if (!expectedAddress || activeAccountRef.current === expectedAddress) return true;
    }

    try {
      await connectWalletRef.current?.();
    } catch {
      // swallow and evaluate final state below
    }

    if (walletConnectedRef.current && activeAccountRef.current) {
      if (!expectedAddress || activeAccountRef.current === expectedAddress) return true;
    }

    if (expectedAddress) {
      try {
        await addStaticAccount(expectedAddress);
      } catch {
        //
      }
    }

    return !!walletConnectedRef.current;
  }, [addStaticAccount]);

  // Monitor wallet connection health - if walletInfo exists but connection is lost, clear state
  useEffect(() => {
    if (!aeSdk || !walletConnected || !walletInfo) return undefined;

    // Set up a health check interval to detect stale connections
    const healthCheckInterval = setInterval(async () => {
      try {
        // eslint-disable-next-line no-underscore-dangle
        const accountsCurrent = aeSdk._accounts?.current || {};
        const hasAccounts = Object.keys(accountsCurrent).length > 0;

        // If we think we're connected but have no accounts, the connection is stale
        if (!hasAccounts) {
          console.warn('Wallet connection lost, cleaning up state');
          setWalletConnected(false);
          setWalletInfo(undefined);
          wallet.current = undefined;
        }
      } catch {
        // Connection check failed, mark as disconnected
        setWalletConnected(false);
      }
    }, 5000); // Check every 5 seconds

    return () => {
      clearInterval(healthCheckInterval);
    };
  }, [aeSdk, walletConnected, walletInfo, setWalletConnected, setWalletInfo]);

  return {
    walletInfo,
    attemptReconnection,
    reconnectWalletSession,
    connectWallet,
    deepLinkWalletConnect,
    disconnectWallet,
    scanForWallets,
    connectingWallet,
    scanningForAccounts,
    walletConnected,
    availableNetworks,
  };
}
