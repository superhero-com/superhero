import React, { useEffect, useState } from 'react';
import { DEX_ADDRESSES } from '../libs/dex';
import AeButton from '../components/AeButton';

import { useWallet } from '../hooks';
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
    <div className="max-w-[720px] mx-auto py-4 px-4">
      <h2 className="text-2xl font-bold text-white mb-4">Import Pool</h2>
      <div className="grid gap-2">
        <input 
          placeholder="Token A (ct_...)" 
          value={tokenA} 
          onChange={(e) => setTokenA(e.target.value)} 
          className="px-2.5 py-2 rounded-lg bg-[#1a1a23] text-white border border-gray-600 focus:outline-none focus:border-purple-400"
        />
        <input 
          placeholder="Token B (ct_...)" 
          value={tokenB} 
          onChange={(e) => setTokenB(e.target.value)} 
          className="px-2.5 py-2 rounded-lg bg-[#1a1a23] text-white border border-gray-600 focus:outline-none focus:border-purple-400"
        />
        <AeButton 
          onClick={() => void check()} 
          disabled={!address || !tokenA || !tokenB} 
          variant="secondary-dark" 
          size="large"
        >
          Check
        </AeButton>
        {result && (
          <div className="text-sm text-white/85 p-3 bg-white/5 rounded-lg border border-white/10">
            {result.pairId ? (
              <div className="text-green-400">Found pool {result.pairId}, your LP: {(result.balance as any).toString()}</div>
            ) : (
              <div className="text-yellow-400">No pool found or no position</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


