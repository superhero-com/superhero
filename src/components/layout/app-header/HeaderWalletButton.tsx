import React from 'react';
import { useAccount } from '../../../hooks';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { useWalletConnect } from '../../../hooks/useWalletConnect';
import Favicon from '../../../svg/favicon.svg?react';
import Identicon from '../../Identicon';
import { formatAddress } from '../../../utils/address';
import AddressAvatar from '../../../components/AddressAvatar';
import { AeButton } from '@/components/ui/ae-button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/ae-dropdown-menu';
import { cn } from '@/lib/utils';

export default function HeaderWalletButton() {
  const { activeAccount } = useAeSdk();
  const { connectWallet, disconnectWallet, walletInfo } = useWalletConnect();
  const { decimalBalance, chainName } = useAccount();
  const [loading, setLoading] = React.useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      await connectWallet();
    } finally {
      setLoading(false);
    }
  }
  const handleLogout = () => {
    disconnectWallet();
  };

  // If not connected, show connect button
  if (!walletInfo && !activeAccount) {
    return (
      <AeButton
        onClick={handleConnect}
        disabled={loading}
        loading={loading}
        variant="default"
        size="default"
        className="gap-2"
      >
        <Favicon className="w-4 h-4" />
        {loading ? 'Connecting…' : 'Connect Wallet'}
      </AeButton>
    );
  }

  // If connected, show user info with dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <AeButton
          variant="ghost"
          size="default"
          className="gap-2 h-12 px-3"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden">
              <Identicon address={activeAccount} size={32} name={chainName} />
            </div>
            <div className="flex flex-col items-start text-left">
              <div className="text-sm font-semibold text-foreground">
                {chainName ?? formatAddress(activeAccount)}
              </div>
              <div className="text-xs text-muted-foreground">
                {decimalBalance.prettify()} AE
              </div>
            </div>
          </div>
        </AeButton>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80 p-4" align="end">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden">
            <Identicon address={activeAccount} size={40} name={chainName} />
          </div>
          <div className="flex-1 min-w-0">
            {chainName && (
              <div className="font-semibold text-foreground mb-1">
                {chainName}
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
              {chainName && (
                <AddressAvatar address={activeAccount} size={24} />
              )}
              <span className="truncate">{formatAddress(activeAccount)}</span>
            </div>
          </div>
        </div>
        
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
