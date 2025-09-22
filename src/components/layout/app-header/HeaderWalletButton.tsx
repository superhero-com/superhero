import AddressAvatarWithChainName from '@/@components/Address/AddressAvatarWithChainName';
import { AeButton } from '@/components/ui/ae-button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/ae-dropdown-menu';
import React from 'react';
import { useAccount } from '../../../hooks';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { useWalletConnect } from '../../../hooks/useWalletConnect';
import { useModal } from '../../../hooks';
import Favicon from '../../../svg/favicon.svg?react';

export default function HeaderWalletButton() {
  const { activeAccount } = useAeSdk();
  const { disconnectWallet, walletInfo } = useWalletConnect();
  const { openModal } = useModal();
  const { decimalBalance } = useAccount();
  const handleConnect = () => openModal({ name: 'connect-wallet' });
  const handleLogout = () => {
    disconnectWallet();
    try { window.location.reload(); } catch {}
  };

  // If not connected, show connect button
  if (!walletInfo && !activeAccount) {
    return (
      <AeButton
        onClick={handleConnect}
        disabled={false}
        loading={false}
        variant="default"
        size="default"
        className="gap-2"
      >
        <Favicon className="w-4 h-4" />
        Connect Wallet
      </AeButton>
    );
  }

  // If connected, show user info with dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div>
          <AddressAvatarWithChainName
            isHoverEnabled={false}
            address={activeAccount}
            size={36}
            overlaySize={18}
            showBalance={true}
            showAddressAndChainName={false}
            className="max-w-[120px] md:max-w-[min(100%,250px)]"
          />
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80 p-4" align="end">
        <AddressAvatarWithChainName
          isHoverEnabled={false}
          address={activeAccount}
          size={36}
          overlaySize={18}
        />

        <DropdownMenuSeparator className="my-3" />

        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg mb-3">
          <span className="text-sm text-muted-foreground">Balance:</span>
          <span className="font-semibold text-foreground font-mono">
            {decimalBalance.prettify()} AE
          </span>
        </div>

        <DropdownMenuItem
          onClick={handleLogout}
          className="w-full justify-center text-destructive hover:text-destructive-foreground hover:bg-destructive"
        >
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
