import { useContext, useMemo, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { activeAccountAtom } from '@/atoms/accountAtoms';
import { walletInfoAtom, walletConnectedAtom } from '../atoms/walletAtoms';
import { AeSdkContext } from '../context/AeSdkProvider';

export const useAeSdk = () => {
  const walletInfo = useAtomValue(walletInfoAtom);
  const walletConnected = useAtomValue(walletConnectedAtom);
  const activeAccount = useAtomValue(activeAccountAtom);

  const context = useContext(AeSdkContext);
  if (!context) {
    throw new Error('useAeSdk must be used within an AeSdkProvider');
  }

  /**
   * Return the appropriate SDK based on wallet connection state:
   * - If wallet is actively connected: use aeSdk (AeSdkAepp) for wallet operations
   * - Otherwise: use staticAeSdk (AeSdk) for read-only or static account operations
   *
   * Note: We check walletConnected (runtime state) not just walletInfo (persisted state)
   * to ensure we don't try to use wallet SDK when connection is actually lost.
   */
  const sdk = useMemo(() => {
    if (walletConnected && walletInfo && activeAccount) {
      return context.aeSdk;
    }
    return context.staticAeSdk;
  }, [walletConnected, walletInfo, activeAccount, context.aeSdk, context.staticAeSdk]);

  const isWalletSessionReady = useMemo(
    () => Boolean(context.sdkInitialized && walletConnected && walletInfo && activeAccount),
    [context.sdkInitialized, walletConnected, walletInfo, activeAccount],
  );

  /**
   * Ensure that when we're using staticAeSdk and have an activeAccount,
   * that account is properly added to the SDK.
   * This handles cases where account is set after SDK initialization.
   */
  useEffect(() => {
    const { staticAeSdk, addStaticAccount, sdkInitialized } = context;
    if (!walletConnected && activeAccount && staticAeSdk && addStaticAccount && sdkInitialized) {
      // Check if the account is already added and selected
      // eslint-disable-next-line no-underscore-dangle
      const currentAccounts = (staticAeSdk as any)._accounts?.current || {};
      const selectedAddress = Object.keys(currentAccounts)[0];

      // Only add if the account is not currently selected
      if (selectedAddress !== activeAccount) {
        addStaticAccount(activeAccount);
      }
    }
    // Intentionally depend on specific context fields only so this effect does not
    // re-run when context identity changes (e.g. currentBlockHeight polling).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    walletConnected,
    activeAccount,
    context.staticAeSdk,
    context.addStaticAccount,
    context.sdkInitialized,
  ]);

  return {
    ...context,
    sdk,
    isWalletSessionReady,
    // Override activeAccount from context with the atom value to ensure reactivity
    activeAccount,
  };
};
