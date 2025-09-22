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
        "sm:bg-card sm:hover:bg-card/80 sm:text-inherit",
        "bg-[#1161FE] text-white border-none rounded-full",
        className
      )}
      style={style}
    >
      <span className="hidden sm:inline-flex items-center gap-2">
        <Favicon className="w-4 h-4" />
        {connectingWallet ? 'Connecting…' : label}
      </span>
      <span className="sm:hidden">
        {connectingWallet ? 'Connecting…' : label}
      </span>
    </AeButton>
  );
}


