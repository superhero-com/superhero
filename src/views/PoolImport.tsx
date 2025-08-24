import React, { useEffect, useState } from 'react';
import { DEX_ADDRESSES } from '../libs/dex';
import AeButton from '../components/AeButton';

import { useWallet } from '../../hooks';
export default function PoolImport() {
    const address = useWallet().address;
  const [tokenA, setTokenA] = useState('');
  const [tokenB, setTokenB] = useState('');
  const [result, setResult] = useState<{ pairId: string | null; balance: bigint } | null>(null);

  async function check() {
    if (!address || !tokenA || !tokenB) return;
    const res = await loadAccountLp({ address, tokenA, tokenB });
    setResult(res as any);
  }

  return (
    <div className="container" style={{ maxWidth: 720, margin: '0 auto', padding: '16px 0' }}>
      <h2>Import Pool</h2>
      <div style={{ display: 'grid', gap: 8 }}>
        <input placeholder="Token A (ct_...)" value={tokenA} onChange={(e) => setTokenA(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, background: '#1a1a23', color: 'white', border: '1px solid #3a3a4a' }} />
        <input placeholder="Token B (ct_...)" value={tokenB} onChange={(e) => setTokenB(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, background: '#1a1a23', color: 'white', border: '1px solid #3a3a4a' }} />
        <AeButton onClick={() => void check()} disabled={!address || !tokenA || !tokenB} variant="secondary-dark" size="large">Check</AeButton>
        {result && (
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            {result.pairId ? (
              <div>Found pool {result.pairId}, your LP: {(result.balance as any).toString()}</div>
            ) : (
              <div>No pool found or no position</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


