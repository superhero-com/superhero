/* eslint-disable no-use-before-define */
import {
  BrowserWindowMessageConnection,
  walletDetector,
} from '@aeternity/aepp-sdk';
import { useAtom } from 'jotai';
import {
  useEffect, useRef,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { WalletInfo } from 'node_modules/@aeternity/aepp-sdk/es/aepp-wallet-communication/rpc/types';
import { IS_FRAMED_AEPP, IS_MOBILE, IS_SAFARI } from '../utils/constants';
import { useAeSdk } from './useAeSdk';
import { createDeepLinkUrl } from '../utils/url';
import { validateHash } from '../utils/address';
import { configs } from '../configs';
import type { Wallet, Wallets } from '../utils/types';
import {
  walletInfoAtom,
  walletConnectedAtom,
  connectingWalletAtom,
  scanningForAccountsAtom,
} from '../atoms/walletAtoms';
import { useAccount } from './useAccount';

export function useWalletConnect() {
  const wallet = useRef<Wallet | undefined>(undefined);
  const scanStopRef = useRef<null | (() => void)>(null);
  const scanConnectionRef = useRef<BrowserWindowMessageConnection | null>(null);
  const scanPromiseRef = useRef<Promise<Wallet | undefined> | null>(null);
  const reconnectionAttemptedRef = useRef(false);

  const { loadAccountData } = useAccount();
  const [walletInfo, setWalletInfo] = useAtom<WalletInfo | undefined>(walletInfoAtom);
  const [scanningForAccounts, setScanningForAccounts] = useAtom(scanningForAccountsAtom);
  const [connectingWallet, setConnectingWallet] = useAtom(connectingWalletAtom);
  const [walletConnected, setWalletConnected] = useAtom(walletConnectedAtom);

  const location = useLocation();
  const navigate = useNavigate();
  const {
    aeSdk, scanForAccounts, addStaticAccount, setActiveAccount, setAccounts, activeAccount,
  } = useAeSdk();

  // Get available networks from config
  const availableNetworks = Object.values(configs.networks).filter((network) => !network.disabled);

  // React equivalent of Vue watch for route query parameters
  useEffect(() => {
    async function checkAddressWalletConnection() {
      const query = Object.fromEntries(new URLSearchParams(location.search).entries());

      if (query.address && !activeAccount) {
        const address = query.address as string;
        const addressValidation = validateHash(address);

        if (!addressValidation.valid) {
          navigate({ search: '' });
          return;
        }

        await addStaticAccount(address);
        navigate({ search: '' });
      }
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
    const addressDeepLink = createDeepLinkUrl({
      type: 'address',
      'x-success': `${window.location.href.split('?')[0]
        }?address={address}&networkId={networkId}`,
      'x-cancel': window.location.href.split('?')[0],
    });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    window.location = addressDeepLink;
  }

  // eslint-disable-next-line consistent-return
  async function connectWallet() {
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
  }

  async function disconnectWallet() {
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
    // Concurrency safety: if a scan is already running, reuse it instead of starting a new one.
    if (scanPromiseRef.current) return scanPromiseRef.current;

    const scanPromise = new Promise<Wallet | undefined>((resolve) => {
      let isDone = false;
      const scannerConnection = new BrowserWindowMessageConnection({ debug: false });
      const cleanup = () => {
        if (isDone) return;
        isDone = true;

        try {
          stopScan();
        } catch {
          // ignore
        }
        try {
          scannerConnection.disconnect?.();
        } catch {
          // ignore
        }

        // Clear shared refs only if they still point to this scan's resources.
        if (scanConnectionRef.current === scannerConnection) scanConnectionRef.current = null;
        if (scanStopRef.current === stopScan) scanStopRef.current = null;
        if (scanPromiseRef.current === scanPromise) scanPromiseRef.current = null;
      };

      const $walletConnectTimeout = setTimeout(
        () => {
          cleanup();
          resolve(undefined);
        },
        (IS_MOBILE || IS_SAFARI) && !IS_FRAMED_AEPP ? 7000 : 15000,
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

      const stopScan = walletDetector(scannerConnection, handleWallets);
      scanConnectionRef.current = scannerConnection;
      scanStopRef.current = stopScan;
    });

    scanPromiseRef.current = scanPromise;
    return scanPromise;
  }

  /**
   * Attempt to reconnect using persisted wallet state.
   * This is called once on app initialization to restore previous wallet connection.
   */
  async function attemptReconnection() {
    // Prevent multiple reconnection attempts
    if (reconnectionAttemptedRef.current) {
      return;
    }
    reconnectionAttemptedRef.current = true;

    // Guard against concurrent operations
    if (connectingWallet || walletConnected) {
      return;
    }

    // Check if we have persisted wallet info but no active connection
    if (walletInfo && !walletConnected && aeSdk) {
      try {
        setConnectingWallet(true);

        // Try to scan for the previously connected wallet
        wallet.current = await scanForWallets();

        if (wallet.current) {
          // Attempt to reconnect using the found wallet
          const newWalletInfo = await aeSdk.connectToWallet(wallet.current.getConnection());
          setWalletInfo(newWalletInfo);
          await subscribeAddress();
          setWalletConnected(true);
        } else {
          // No wallet found, clear persisted state
          setWalletInfo(undefined);
          setWalletConnected(false);
        }
      } catch (error) {
        // Reconnection failed, clear persisted state
        setWalletInfo(undefined);
        setWalletConnected(false);
      } finally {
        setConnectingWallet(false);
      }
    } else if (activeAccount && !walletInfo) {
      // We have a persisted account but no wallet info - it's a static (read-only) account
      try {
        await addStaticAccount(activeAccount);
        await loadAccountData();
      } catch {
        // Failed to add static account
      }
    }
  }

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
