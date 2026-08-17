import { AddressAvatarWithChainName } from '@/@components/Address/AddressAvatarWithChainName';
import { ConnectWalletButton } from '@/components/ConnectWalletButton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/ae-dropdown-menu';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAccount } from '../../../hooks';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { useWalletConnect } from '../../../hooks/useWalletConnect';
import { IconThreeDots } from '../../../icons';

const HeaderWalletButton = () => {
  const { t } = useTranslation('common');
  const { activeAccount } = useAeSdk();
  const { disconnectWallet } = useWalletConnect();
  const { decimalBalance } = useAccount();
  const navigate = useNavigate();
  const handleLogout = async () => {
    await disconnectWallet();
    window.location.reload();
  };
  const handleProfileClick = () => {
    if (activeAccount) {
      navigate(`/users/${activeAccount}`);
    }
  };

  // If not connected, show the connect button. ConnectWalletButton owns the
  // standalone gate: in an installed PWA it opens the inline onboarding flow,
  // otherwise it opens the external connect modal.
  if (!activeAccount) {
    return (
      <ConnectWalletButton
        variant="dex"
        label={t('buttons.connectWalletDex')}
        className="gap-2 rounded-xl sm:rounded-full text-sm"
      />
    );
  }

  // If connected, show user info with clickable avatar and separate menu button
  return (
    <div className="inline-flex items-center gap-3 max-w-full">
      <button
        type="button"
        onClick={handleProfileClick}
        className="cursor-pointer hover:opacity-80 transition-opacity rounded-lg px-1 py-0.5 hover:bg-white/5 max-w-[210px] overflow-hidden"
        aria-label={t('aria.viewProfile')}
      >
        <AddressAvatarWithChainName
          key={activeAccount}
          isHoverEnabled={false}
          address={activeAccount}
          size={36}
          showBalance={false}
          showAddressAndChainName={false}
          showPrimaryOnly
          contentClassName="px-2 pb-0 max-w-[160px] overflow-hidden"
          className="w-full max-w-[210px]"
        />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="p-1.5 rounded-lg border border-solid border-white/30 hover:bg-white/10 hover:border-white/40 active:bg-white/15 transition-colors cursor-pointer flex items-center justify-center min-w-[36px] min-h-[36px]"
            style={{ borderWidth: '1px' }}
            aria-label={t('aria.accountMenu')}
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
            showAddressAndChainName
            truncateAddress={false}
            contentClassName="px-3 pb-2"
          />

          <DropdownMenuSeparator className="my-3" />

          <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg mb-3">
            <span className="text-sm text-muted-foreground">
              {t('labels.balance')}
              :
            </span>
            <span className="font-semibold text-foreground font-mono">
              {decimalBalance.prettify()}
              {' '}
              AE
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
};

export default HeaderWalletButton;
