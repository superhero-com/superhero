import { useContext, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { activeAccountAtom } from '@/atoms/accountAtoms';
import { walletInfoAtom } from '../atoms/walletAtoms';
import { AeSdkContext } from '../context/AeSdkProvider';

export const useAeSdk = () => {
  const walletInfo = useAtomValue(walletInfoAtom);
  const activeAccount = useAtomValue(activeAccountAtom);

  const context = useContext(AeSdkContext);
  if (!context) {
    throw new Error('useAeSdk must be used within an AeSdkProvider');
  }
  const sdk = useMemo(() => {
    if (walletInfo && activeAccount) {
      return context.aeSdk;
    }
    return context.staticAeSdk;
  }, [walletInfo, activeAccount, context.aeSdk, context.staticAeSdk]);

  return {
    ...context,
    sdk,
    // Override activeAccount from context with the atom value to ensure reactivity
    activeAccount,
  };
};
