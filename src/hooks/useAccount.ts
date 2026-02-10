import { useAccountBalances } from './useAccountBalances';
import { useAeSdk } from './useAeSdk';
import { useChainName } from './useChainName';

export const useAccount = () => {
  const { activeAccount } = useAeSdk();
  const accountBalances = useAccountBalances(activeAccount);
  const { chainName } = useChainName(activeAccount);

  return {
    ...accountBalances,
    activeAccount,
    chainName,
  };
};
