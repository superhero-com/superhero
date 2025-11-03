import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAeSdk, useWalletConnect, useModal } from '../hooks';
import Favicon from '../svg/favicon.svg?react';
import { AeButton } from './ui/ae-button';
import { cn } from '@/lib/utils';

type Props = {
  label?: string;
  block?: boolean;
  style?: React.CSSProperties;
  className?: string;
  variant?: 'default' | 'dex';
  muted?: boolean; // greyed-out appearance while still clickable
};

export function ConnectWalletButton({ label, block, style, className, variant = 'default', muted = false }: Props) {
  const { t } = useTranslation('common');
  const { activeAccount } = useAeSdk()
  const { connectWallet, connectingWallet } = useWalletConnect()
  const { openModal } = useModal();
  
  const displayLabel = label || t('buttons.connectWallet');
  const connectingText = t('buttons.connecting');

  if (activeAccount) return null;
  
  const dexClasses = cn(
    // Mobile (default): superhero blue with card-like radius
    'bg-[#1161FE] text-white border-none rounded-xl text-sm',
    // Desktop+: elegant dark/glass pill with icon
    'sm:bg-black/80 sm:text-white sm:border sm:border-white/10 sm:backdrop-blur-[10px] sm:hover:bg-black/70 sm:!rounded-full sm:text-sm',
    'sm:shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:sm:shadow-[0_12px_32px_rgba(0,0,0,0.45)]'
  );

  const baseClasses = cn(
    'rounded-xl sm:rounded-full border-border bg-card backdrop-blur-sm backdrop-saturate-120 hover:bg-card/80 hover:shadow-md text-sm',
    'sm:bg-card sm:hover:bg-card/80 sm:text-sm',
    'bg-[#1161FE] text-white border-none rounded-xl sm:rounded-full'
  );

  const mutedClasses = cn(
    'rounded-xl sm:rounded-full text-sm',
    'bg-white/10 text-white/70 border border-white/10 hover:bg-white/10 hover:text-white/80',
    'shadow-none'
  );

  return (
    <AeButton
      onClick={() => openModal({ name: 'connect-wallet' })}
      disabled={connectingWallet}
      loading={connectingWallet}
      variant="ghost"
      size={variant === 'dex' ? 'default' : 'default'}
      fullWidth={block}
      className={cn(muted ? mutedClasses : (variant === 'dex' ? dexClasses : baseClasses), className)}
      style={style}
    >
      <span className="hidden sm:inline-flex items-center gap-2">
        <Favicon className="w-4 h-4" />
        {(connectingWallet ? connectingText : displayLabel).toUpperCase()}
      </span>
      <span className="sm:hidden">
        {(connectingWallet ? connectingText : displayLabel).toUpperCase()}
      </span>
    </AeButton>
  );
}


export default ConnectWalletButton;