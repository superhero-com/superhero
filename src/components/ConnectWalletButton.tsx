import React from 'react';
import { useAeSdk, useWalletConnect } from '../hooks';
import Favicon from '../svg/favicon.svg?react';

type Props = {
  label?: string;
  block?: boolean;
  style?: React.CSSProperties;
  className?: string;
};

export default function ConnectWalletButton({ label = 'Connect Wallet', block, style, className }: Props) {
  const { activeAccount } = useAeSdk()
  const { connectWallet, connectingWallet } = useWalletConnect()


  if (activeAccount) return null;
  return (
    <button
      type="button"
      onClick={() => connectWallet()}
      disabled={connectingWallet}
      className={`connect-wallet-btn ${className || ''}`.trim()}
      style={{
        padding: '6px 12px',
        borderRadius: 999,
        border: '1px solid var(--search-nav-border-color)',
        background: 'var(--thumbnail-background-color)',
        color: 'var(--standard-font-color)',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        width: block ? '100%' : undefined,
        backdropFilter: 'saturate(120%)',
        ...(style || {}),
      }}
    >
      <span style={{ display: 'inline-grid', placeItems: 'center' }}>
        <Favicon style={{ width: 16, height: 16 }} />
      </span>
      <span style={{ whiteSpace: 'nowrap' }}>{connectingWallet ? 'Connecting…' : label}</span>
      <style>{`
        .connect-wallet-btn { transition: background-color .15s ease, box-shadow .15s ease, border-color .15s ease; line-height: 1; }
        .connect-wallet-btn:hover { background: var(--thumbnail-background-color-alt); box-shadow: 0 6px 16px rgba(0,0,0,0.12); }
        .connect-wallet-btn:active { box-shadow: 0 3px 8px rgba(0,0,0,0.16) inset; }
        .connect-wallet-btn:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(17,97,254,0.35); }
      `}</style>
    </button>
  );
}


