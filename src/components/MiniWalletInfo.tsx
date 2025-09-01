import React from 'react';
import { useWallet, useWalletConnect } from '../hooks';
import Identicon from './Identicon';

type Props = { block?: boolean } & React.HTMLAttributes<HTMLDivElement>;

export default function MiniWalletInfo({ block, style, ...rest }: Props) {
  const { disconnectWallet } = useWalletConnect()
  const { address, balance } = useWallet();

  if (!address) return null;

  const short = `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <div
      {...rest}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: block ? '10px 12px' : undefined,
        borderRadius: block ? 999 : undefined,
        border: block ? '1px solid rgba(0,0,0,0.12)' : undefined,
        background: block ? '#111' : undefined,
        color: block ? '#fff' : undefined,
        ...(style || {}),
      }}
    >
      <Identicon address={address} size={24} />
      <div style={{ display: 'grid', lineHeight: 1 }}>
        <div style={{ fontWeight: 700 }}>{short}</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>{Number(balance || 0).toLocaleString(undefined, { maximumFractionDigits: 6 })} AE</div>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
        {/* <button
          onClick={() => refreshAeBalance()}
          title="Refresh balance"
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'inherit' }}
        >
          Refresh
        </button> */}
        <button
          onClick={() => disconnectWallet()}
          title="Logout"
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'inherit' }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}


