import React from 'react';
import { useAeSdk, useWalletConnect, useModal } from '../hooks';
import Favicon from '../svg/favicon.svg?react';
import { AeButton } from './ui/ae-button';
import { cn } from '@/lib/utils';

type Props = {
  label?: string;
  block?: boolean;
  style?: React.CSSProperties;
  className?: string;
};

export default function ConnectWalletButton({ label = 'Connect Wallet', block, style, className }: Props) {
  const { activeAccount } = useAeSdk()
  const { connectWallet, connectingWallet } = useWalletConnect()
  const { openModal } = useModal();

  if (activeAccount) return null;
  
  return (
    <AeButton
      onClick={() => openModal({ name: 'connect-wallet' })}
      disabled={connectingWallet}
      loading={connectingWallet}
      variant="ghost"
      size="default"
      fullWidth={block}
      className={cn(
        "rounded-full border-border bg-card backdrop-blur-sm backdrop-saturate-120 hover:bg-card/80 hover:shadow-md",
        className
      )}
      style={style}
    >
      <Favicon className="w-4 h-4" />
      {connectingWallet ? 'Connecting…' : label}
    </AeButton>
  );
}


