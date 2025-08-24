import React from 'react';
import { useWallet } from '../../hooks';

export default function TokenSelect({ onSelect, onClose }: { onSelect: (token: string) => void; onClose: () => void }) {
  const { tokenInfo } = useWallet();
  const tokens = Object.entries(tokenInfo || {});
  return (
    <div>
      <h3>Select token</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        <button onClick={() => { onSelect('native'); onClose(); }}>#AE (native)</button>
        {tokens.map(([address, info]: any) => (
          <button key={address} onClick={() => { onSelect(address); onClose(); }}>
            #{info?.symbol || address}
          </button>
        ))}
      </div>
    </div>
  );
}


