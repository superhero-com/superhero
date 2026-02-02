import AddressAvatarWithChainName from '@/@components/Address/AddressAvatarWithChainName';
import { AeButton } from '@/components/ui/ae-button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/ae-dropdown-menu';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccount } from '../../../hooks';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { useWalletConnect } from '../../../hooks/useWalletConnect';
import { useModal } from '../../../hooks';
import Favicon from '../../../svg/favicon.svg?react';
import { IconThreeDots } from '../../../icons';
import { useActiveChain } from '@/hooks/useActiveChain';
import { useSolanaWallet } from '@/chains/solana/hooks/useSolanaWallet';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function HeaderWalletButton() {
  const { t } = useTranslation('common');
  const { activeAccount } = useAeSdk();
  const { disconnectWallet, walletInfo } = useWalletConnect();
  const { openModal } = useModal();
  const { decimalBalance } = useAccount();
  const { selectedChain } = useActiveChain();
  const solanaWallet = useSolanaWallet();
  const navigate = useNavigate();
  const handleConnect = () => openModal({ name: 'connect-wallet' });
  const handleLogout = () => {
    disconnectWallet();
    try { window.location.reload(); } catch {}
  };
  const handleProfileClick = () => {
    if (activeAccount) {
      navigate(`/users/${activeAccount}`);
    }
  };

  if (selectedChain === 'solana') {
    if (!solanaWallet.publicKey) {
      return (
        <WalletMultiButton className="gap-2 rounded-xl sm:rounded-full text-sm !bg-[#1161FE] hover:!bg-[#0d4fd6]">
          Connect Solana
        </WalletMultiButton>
      );
    }
    const solAddress = solanaWallet.publicKey.toBase58();
    return (
      <div className="inline-flex items-center gap-3">
        <button
          onClick={() => navigate(`/users/${solAddress}`)}
          className="cursor-pointer hover:opacity-80 transition-opacity rounded-lg px-1 py-0.5 hover:bg-white/5"
          aria-label="View profile"
        >
          <AddressAvatarWithChainName
            key={solAddress}
            isHoverEnabled={false}
            address={solAddress}
            size={36}
            overlaySize={18}
            showBalance={true}
            showAddressAndChainName={false}
            showPrimaryOnly={true}
            hideFallbackName={true}
            contentClassName="px-2 pb-0"
            className="w-auto"
          />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-1.5 rounded-lg border border-solid border-white/30 hover:bg-white/10 hover:border-white/40 active:bg-white/15 transition-colors cursor-pointer flex items-center justify-center min-w-[36px] min-h-[36px]"
              style={{ borderWidth: '1px' }}
              aria-label="Account menu"
            >
              <IconThreeDots className="w-5 h-5 text-[var(--standard-font-color)]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-[560px] p-4" align="end">
            <AddressAvatarWithChainName
              key={solAddress}
              isHoverEnabled={false}
              address={solAddress}
              size={40}
              overlaySize={18}
              showAddressAndChainName={true}
              truncateAddress={false}
              contentClassName="px-3 pb-2"
            />
            <DropdownMenuSeparator className="my-3" />
            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg mb-3">
              <span className="text-sm text-muted-foreground">{t('labels.balance')}:</span>
              <span className="font-semibold text-foreground font-mono">
                {decimalBalance.prettify()} SOL
              </span>
            </div>
            <DropdownMenuItem
              onClick={() => solanaWallet.disconnect()}
              className="w-full justify-center text-destructive hover:text-destructive-foreground hover:bg-destructive"
            >
              {t('buttons.disconnect')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // If not connected or activeAccount is undefined, show connect button
  if (!activeAccount) {
    return (
      <AeButton
        onClick={handleConnect}
        disabled={false}
        loading={false}
        variant="default"
        size="default"
        className="gap-2 rounded-xl sm:rounded-full text-sm"
      >
        <Favicon className="w-4 h-4" />
        {t('buttons.connectWalletDex')}
      </AeButton>
    );
  }

  // If connected, show user info with clickable avatar and separate menu button
  return (
    <div className="inline-flex items-center gap-3 max-w-full">
      <button
        onClick={handleProfileClick}
        className="cursor-pointer hover:opacity-80 transition-opacity rounded-lg px-1 py-0.5 hover:bg-white/5 max-w-[210px] overflow-hidden"
        aria-label="View profile"
      >
        <AddressAvatarWithChainName
          key={activeAccount}
          isHoverEnabled={false}
          address={activeAccount}
          size={36}
          overlaySize={18}
          showBalance={false}
          showAddressAndChainName={false}
          showPrimaryOnly={true}
          hideFallbackName={true}
          contentClassName="px-2 pb-0 max-w-[160px] overflow-hidden"
          className="w-full max-w-[210px]"
        />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-1.5 rounded-lg border border-solid border-white/30 hover:bg-white/10 hover:border-white/40 active:bg-white/15 transition-colors cursor-pointer flex items-center justify-center min-w-[36px] min-h-[36px]"
            style={{ borderWidth: '1px' }}
            aria-label="Account menu"
          >
            <IconThreeDots className="w-5 h-5 text-[var(--standard-font-color)]" />
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          className="min-w-[320px] max-w-[360px] p-4 z-[1101]"
          align="center"
          side="top"
          sideOffset={8}
        >
          <AddressAvatarWithChainName
            key={activeAccount}
            isHoverEnabled={false}
            address={activeAccount}
            size={40}
            overlaySize={18}
            showAddressAndChainName={true}
            truncateAddress={false}
            contentClassName="px-3 pb-2"
          />

          <DropdownMenuSeparator className="my-3" />

          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg mb-3">
            <span className="text-sm text-muted-foreground">{t('labels.balance')}:</span>
            <span className="font-semibold text-foreground font-mono">
              {decimalBalance.prettify()} AE
            </span>
          </div>

          <DropdownMenuItem
            onClick={handleLogout}
            className="w-full justify-center text-destructive hover:text-destructive-foreground hover:bg-destructive"
          >
            {t('buttons.disconnect')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
