import { useSyncShortsWalletSession } from './shorts-wallet-session';

const ShortsWalletSync = ({ address }: { address?: string }) => {
  useSyncShortsWalletSession(address);
  return null;
};

export default ShortsWalletSync;
