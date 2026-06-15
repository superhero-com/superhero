import {
  useCallback,
  useEffect,
  useRef,
} from 'react';
import {
  getSdkAddress,
  normalizeAddress,
  sdkHasAccount,
} from '@/utils/walletSdk';

type MaybeAsync<T> = T | Promise<T>;

type UseWalletReconnectOptions = {
  activeAccount?: string;
  targetAddress?: string;
  signerSdks?: unknown[];
  walletConnected?: boolean;
  walletInfo?: unknown;
  connectingWallet?: boolean;
  connectWallet?: () => MaybeAsync<unknown>;
  restoreAccount?: (address: string) => MaybeAsync<unknown>;
  defaultTimeoutMs?: number;
  requireWalletConnectedForSigner?: boolean;
};

export function useWalletReconnect({
  activeAccount,
  targetAddress,
  signerSdks = [],
  walletConnected = false,
  walletInfo = null,
  connectingWallet = false,
  connectWallet,
  restoreAccount,
  defaultTimeoutMs = 20_000,
  requireWalletConnectedForSigner = false,
}: UseWalletReconnectOptions) {
  const activeAccountRef = useRef<string | undefined>(activeAccount);
  const signerSdksRef = useRef<unknown[]>(signerSdks);
  const walletConnectedRef = useRef(walletConnected);
  const walletInfoRef = useRef(walletInfo);
  const connectingWalletRef = useRef(connectingWallet);

  useEffect(() => {
    activeAccountRef.current = activeAccount;
  }, [activeAccount]);

  useEffect(() => {
    signerSdksRef.current = signerSdks;
  }, [signerSdks]);

  useEffect(() => {
    walletConnectedRef.current = walletConnected;
  }, [walletConnected]);

  useEffect(() => {
    walletInfoRef.current = walletInfo;
  }, [walletInfo]);

  useEffect(() => {
    connectingWalletRef.current = connectingWallet;
  }, [connectingWallet]);

  return useCallback(async (
    expectedAddress?: string,
    timeoutMs = defaultTimeoutMs,
  ): Promise<string> => {
    const knownAddress = expectedAddress || targetAddress;
    const normalizedKnownAddress = knownAddress ? normalizeAddress(knownAddress) : '';
    const matchesExpectedAddress = (account?: string | null) => {
      if (!account) return false;
      if (!knownAddress) return true;
      return normalizeAddress(account) === normalizedKnownAddress;
    };
    const getSignerAddress = () => {
      if (requireWalletConnectedForSigner && !walletConnectedRef.current) return '';
      const signers = signerSdksRef.current;
      if (knownAddress) {
        return signers.some((candidate) => sdkHasAccount(candidate, knownAddress))
          ? knownAddress
          : '';
      }
      const signer = signers.find((candidate) => sdkHasAccount(candidate));
      return signer ? getSdkAddress(signer) : '';
    };
    const getReconnectAddress = (): string | null => {
      const signerAddress = getSignerAddress();
      if (signerAddress) return signerAddress;

      const { current } = activeAccountRef;
      if (walletConnectedRef.current && matchesExpectedAddress(current)) {
        return current as string;
      }
      if (!knownAddress && matchesExpectedAddress(current)) {
        return current as string;
      }
      return null;
    };

    const restoreKnownAccount = async () => {
      if (!knownAddress || !restoreAccount) return;
      try {
        await restoreAccount(knownAddress);
      } catch {
        // aepp signer may still be available; continue.
      }
    };

    const immediate = getReconnectAddress();
    if (immediate) {
      await restoreKnownAccount();
      return getReconnectAddress() || immediate;
    }

    await restoreKnownAccount();
    const restored = getReconnectAddress();
    if (restored) return restored;

    if (!walletConnectedRef.current && !walletInfoRef.current && connectWallet) {
      throw new Error('You are not connected to Wallet');
    }

    const canReconnectWallet = !walletConnectedRef.current
      && walletInfoRef.current
      && !connectingWalletRef.current
      && connectWallet;
    if (canReconnectWallet) {
      try {
        await connectWallet();
        walletConnectedRef.current = true;
        const connected = getReconnectAddress();
        if (connected) return connected;
      } catch {
        // Continue waiting below in case wallet state is still propagating.
      }
    }

    return new Promise<string>((resolve, reject) => {
      const startedAt = Date.now();
      let recoveryAttempted = walletConnectedRef.current
        || (!walletInfoRef.current && Boolean(connectWallet))
        || connectingWalletRef.current;
      const interval = window.setInterval(() => {
        const resolvedAddress = getReconnectAddress();
        if (resolvedAddress) {
          window.clearInterval(interval);
          resolve(resolvedAddress);
          return;
        }
        if (!recoveryAttempted && Date.now() - startedAt > 3_000) {
          recoveryAttempted = true;
          const recovery = knownAddress && restoreAccount
            ? restoreAccount(knownAddress)
            : connectWallet?.();
          Promise.resolve(recovery as any).catch(() => {
            // Keep waiting until timeout.
          });
        }
        if (Date.now() - startedAt >= timeoutMs) {
          window.clearInterval(interval);
          reject(new Error('You are not connected to Wallet'));
        }
      }, 300);
    });
  }, [
    connectWallet,
    defaultTimeoutMs,
    requireWalletConnectedForSigner,
    restoreAccount,
    targetAddress,
  ]);
}
