import type { TokenDto } from '@/api/generated/models/TokenDto';
import { useAeSdk, useModal, useWalletConnect } from '@/hooks';
import { useTokenTrade } from '../hooks/useTokenTrade';
import TokenTradePanel from './TokenTradePanel';

interface TokenTradeCardProps {
  token: TokenDto;
  onClose?: () => void;
}

const TokenTradeCard = ({ token, onClose }: TokenTradeCardProps) => {
  const { activeAccount } = useAeSdk();
  const { connectingWallet } = useWalletConnect();
  const { openModal } = useModal();
  const trade = useTokenTrade({ token });
  if (!token?.sale_address) return null;
  return (
    <TokenTradePanel
      token={token}
      trade={trade}
      connected={!!activeAccount}
      connecting={connectingWallet}
      onConnect={() => openModal({ name: 'connect-wallet' })}
      onClose={onClose}
    />
  );
};
export default TokenTradeCard;
