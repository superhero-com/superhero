import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAeSdk, useWalletConnect, useModal } from '../hooks';
import Favicon from '../svg/favicon.svg?react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

/**
 * ConnectWalletButton - Swiss Minimal Design
 * - Clean borders, no rounded corners
 * - Black/white color scheme
 * - Typography-focused
 */

type Props = {
  label?: string;
  block?: boolean;
  style?: React.CSSProperties;
  className?: string;
  variant?: 'default' | 'dex';
  muted?: boolean;
  useThemeColors?: boolean;
};

export function ConnectWalletButton({ label, block, style, className, variant = 'default', muted = false, useThemeColors = true }: Props) {
  const { t } = useTranslation('common');
  const { activeAccount } = useAeSdk()
  const { connectWallet, connectingWallet } = useWalletConnect()
  const { openModal } = useModal();
  const { isDark } = useTheme();
  
  const displayLabel = label || t('buttons.connectWallet');
  const connectingText = t('buttons.connecting');

  if (activeAccount) return null;

  // Swiss minimal colors
  const borderColor = isDark ? '#3f3f46' : '#E4E4E7';

  // Swiss minimal style - dark theme friendly
  const swissStyle: React.CSSProperties = {
    background: 'transparent',
    color: isDark ? '#FFFFFF' : '#000000',
    border: `1px solid ${borderColor}`,
    borderRadius: 0,
    fontWeight: 500,
    letterSpacing: '0.05em',
    fontSize: '0.75rem',
    ...style,
  };

  const mutedStyle: React.CSSProperties = {
    background: 'transparent',
    color: isDark ? '#71717A' : '#71717A',
    border: `1px solid ${borderColor}`,
    borderRadius: 0,
    fontWeight: 500,
    letterSpacing: '0.05em',
    fontSize: '0.75rem',
    ...style,
  };

  return (
    <button
      type="button"
      onClick={() => openModal({ name: 'connect-wallet' })}
      disabled={connectingWallet}
      className={cn(
        'px-4 py-2 inline-flex items-center justify-center gap-2 transition-opacity hover:opacity-90 focus:outline-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
        block && 'w-full',
        className
      )}
      style={muted ? mutedStyle : swissStyle}
    >
      <span className="hidden sm:inline-flex items-center gap-2">
        <Favicon className="w-3.5 h-3.5" />
        {(connectingWallet ? connectingText : displayLabel).toUpperCase()}
      </span>
      <span className="sm:hidden">
        {(connectingWallet ? connectingText : displayLabel).toUpperCase()}
      </span>
    </button>
  );
}

export default ConnectWalletButton;
