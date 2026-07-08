/* eslint-disable no-use-before-define */
import {
  BrowserWindowMessageConnection,
  walletDetector,
} from '@aeternity/aepp-sdk';
import { useAtom, useSetAtom } from 'jotai';
import {
  useCallback,
  useEffect, useRef,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { recentActivitiesAtom } from '../atoms/dexAtoms';
import {
  aex9BalancesAtom,
  balanceAtom,
  walletInfoAtom,
  walletConnectedAtom,
  connectingWalletAtom,
  scanningForAccountsAtom,
} from '../atoms/walletAtoms';
import { liquidityPositionsAtom } from '../features/dex/atoms/positionsAtoms';

/**
 * Detection window for silent reconnection after a page refresh. The extension
 * content script re-announces itself every few seconds, but its injection can
 * lag behind app boot, so this is deliberately more patient than the
 * user-initiated connect flow.
 */
const RECONNECT_WALLET_DETECTION_TIMEOUT_MS = 15_000;

function pruneAccountKeyedMap<T>(
  prev: Record<string, T>,
  allowed: Set<string>,
): Record<string, T> {
  if (allowed.size === 0) return {};
  const next: Record<string, T> = {};
  let changed = false;
  Object.entries(prev).forEach(([k, v]) => {
    if (allowed.has(k)) next[k] = v;
    else changed = true;
  });
  if (Object.keys(prev).length !== Object.keys(next).length) changed = true;
  return changed ? next : prev;
}

/** Jotai may type persisted atoms as possibly async; runtime storage here is sync. */
function asSyncAccountMap<T>(
  prev: Record<string, T> | Promise<Record<string, T>>,
): Record<string, T> {
  return prev instanceof Promise ? {} : prev;
}

function clearAccountKeyedMap<T>(
  prev: Record<string, T> | Promise<Record<string, T>>,
): Record<string, T> {
  const syncPrev = asSyncAccountMap(prev);
  return Object.keys(syncPrev).length === 0 ? syncPrev : {};
}

export function useWalletConnect() {
  const wallet = useRef<Wallet | undefined>(undefined);
  const scanStopRef = useRef<null |(() => void)>(null);
  const scanConnectionRef = useRef<BrowserWindowMessageConnection | null>(null);
  const scanPromiseRef = useRef<Promise<Wallet | undefined> | null>(null);
  const reconnectionAttemptedRef = useRef(false);

  const [walletInfo, setWalletInfo] = useAtom(walletInfoAtom);
  const [scanningForAccounts, setScanningForAccounts] = useAtom(scanningForAccountsAtom);
  const [connectingWallet, setConnectingWallet] = useAtom(connectingWalletAtom);
  const [walletConnected, setWalletConnected] = useAtom(walletConnectedAtom);

  const location = useLocation();
  const navigate = useNavigate();
  const {
    aeSdk,
    scanForAccounts,
    addStaticAccount,
    setActiveAccount,
    setAccounts,
    activeAccount,
    accounts,
    sdkInitialized,
  } = useAeSdk();
  const setBalanceByAccount = useSetAtom(balanceAtom);
  const setAex9ByAccount = useSetAtom(aex9BalancesAtom);
  const setRecentActivitiesByAccount = useSetAtom(recentActivitiesAtom);
  const setLiquidityPositionsByAccount = useSetAtom(liquidityPositionsAtom);
  const activeAccountRef = useRef(activeAccount);
  const walletInfoRef = useRef(walletInfo);
  const walletConnectedRef = useRef(walletConnected);
  const connectingWalletRef = useRef(connectingWallet);
  const connectWalletRef = useRef<(() => Promise<string | null>) | null>(null);
  const reconnectWalletRef = useRef<(() => Promise<string | null>) | null>(null);

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

  // Drop per-account caches for addresses no longer in this session (balance, tokens,
  // DEX activity / LP) so localStorage does not grow without bound across past accounts.
  useEffect(() => {
    if (!sdkInitialized) return;

    const allowed = new Set(
      [...(accounts ?? []), activeAccount].filter(Boolean) as string[],
    );
    if (allowed.size === 0) {
      if (walletInfo || connectingWallet || walletConnected) return;
      setBalanceByAccount(clearAccountKeyedMap);
      setAex9ByAccount(clearAccountKeyedMap);
      setRecentActivitiesByAccount(clearAccountKeyedMap);
      setLiquidityPositionsByAccount(clearAccountKeyedMap);
      return;
    }
    setBalanceByAccount((prev) => pruneAccountKeyedMap(asSyncAccountMap(prev), allowed));
    setAex9ByAccount((prev) => pruneAccountKeyedMap(asSyncAccountMap(prev), allowed));
    setRecentActivitiesByAccount((prev) => pruneAccountKeyedMap(asSyncAccountMap(prev), allowed));
    setLiquidityPositionsByAccount((prev) => pruneAccountKeyedMap(asSyncAccountMap(prev), allowed));
  }, [
    sdkInitialized,
    activeAccount,
    accounts,
    walletInfo,
    connectingWallet,
    walletConnected,
    setBalanceByAccount,
    setAex9ByAccount,
    setRecentActivitiesByAccount,
    setLiquidityPositionsByAccount,
  ]);

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

  async function subscribeAddress({ resetActiveAccount = true } = {}) {
    /*
         * Reset the active account to trigger
         * watchers once the wallet is connected
         * (skipped during silent reconnection to keep the restored session visible)
         */
    if (resetActiveAccount) setActiveAccount(undefined);
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
          const connectedAccount = await scanForAccounts();

          resolve(connectedAccount);
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
  async function connectWallet(): Promise<string | null> {
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
      if (!IS_FRAMED_AEPP) await deepLinkWalletConnect();
      return null;
    }

    try {
      const newWalletInfo = await aeSdk.connectToWallet(wallet.current.getConnection());
      setWalletInfo(newWalletInfo);

      const connectedAccount = await subscribeAddress();
      if (!connectedAccount) throw new Error('No wallet account connected');
      setWalletConnected(true);
      return connectedAccount;
    } catch {
      disconnectWallet();
      return null;
    } finally {
      setConnectingWallet(false);
    }
  }
  connectWalletRef.current = connectWallet;

  /**
   * Silently re-establish the wallet connection after a page refresh.
   *
   * The SDK only emits onAddressChange over an active RPC connection created by
   * connectToWallet, so without this the restored session is read-only and
   * account switches in the extension go unnoticed. Unlike connectWallet, this
   * never clears the restored session up front, never opens a deep link, and
   * keeps the static (read-only) account usable if the wallet does not answer.
   */
  async function reconnectWallet(): Promise<string | null> {
    setConnectingWallet(true);
    try {
      // Extensions only exist in desktop browsers or framed contexts; elsewhere
      // keep the default (short) detection window so we fail fast to static mode.
      const detectionTimeout = (IS_MOBILE || IS_SAFARI) && !IS_FRAMED_AEPP
        ? undefined
        : RECONNECT_WALLET_DETECTION_TIMEOUT_MS;
      wallet.current ??= await scanForWallets(detectionTimeout);
      if (!wallet.current) return null;

      try {
        await aeSdk.disconnectWallet();
      } catch {
        // No previous RPC session in this SDK instance — expected after refresh.
      }
      const newWalletInfo = await aeSdk.connectToWallet(wallet.current.getConnection());
      setWalletInfo(newWalletInfo);

      const connectedAccount = await subscribeAddress({ resetActiveAccount: false });
      if (!connectedAccount) return null;
      setWalletConnected(true);
      return connectedAccount;
    } catch {
      // Keep persisted state intact; the user can still act via deep-link signing.
      return null;
    } finally {
      setConnectingWallet(false);
    }
  }
  reconnectWalletRef.current = reconnectWallet;

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
      localStorage.removeItem('wallet:balance');
      localStorage.removeItem('dex:recentActivities');
      localStorage.removeItem('liquidityPositions');
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
    setBalanceByAccount({});
    setAex9ByAccount({});
    setRecentActivitiesByAccount({});
    setLiquidityPositionsByAccount({});
    try {
      await aeSdk.disconnectWallet();
    } catch {
      //
    }
  }

  /**
   * Scan for wallets
   * @param timeoutMs - overrides the default detection window (see reconnectWallet)
   */
  async function scanForWallets(timeoutMs?: number): Promise<Wallet | undefined> {
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
        timeoutMs ?? ((IS_MOBILE || IS_SAFARI) && !IS_FRAMED_AEPP ? 100 : 4000),
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

    // Guard against concurrent operations
    if (connectingWalletRef.current || walletConnectedRef.current) {
      return;
    }

    // Only a session that was actually connected to a wallet (persisted
    // walletInfo) can be re-established. Leave the attempted flag unset on
    // early return so a later call can retry once persisted state is in place.
    if (!activeAccountRef.current || !walletInfoRef.current) {
      return;
    }

    reconnectionAttemptedRef.current = true;
    await reconnectWalletRef.current?.();
  }, []);

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
    reconnectWallet,
    deepLinkWalletConnect,
    disconnectWallet,
    scanForWallets,
    connectingWallet,
    scanningForAccounts,
    walletConnected,
    availableNetworks,
  };
}
