import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DexTabs from '../components/dex/DexTabs';

import { useWallet } from '../../hooks';
export default function Pool() {
    const address = useWallet().address;
  // Avoid returning a new object reference from selector each render
  const providedRaw = useSelector((s: RootState) => s.dex.providedLiquidity[address || '']);
  const EMPTY: Record<string, any> = React.useMemo(() => ({}), []);
  const provided = providedRaw || EMPTY;
  const navigate = useNavigate();

  React.useEffect(() => {
    if (address) {
      dispatch(scanAccountLiquidity(address));
    }
  }, [address, dispatch]);

  return (
    <div className="container" style={{ maxWidth: 720, margin: '0 auto', padding: '16px 0' }}>
      <DexTabs />
      <h2 style={{ marginBottom: 4 }}>Pool</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 14, opacity: 0.85 }}>Your Liquidity</div>
      </div>
      <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
        {Object.entries(provided).length === 0 && (
          <div style={{ fontSize: 13, opacity: 0.8 }}>No positions found.</div>
        )}
        {Object.entries(provided).map(([pairId, info]) => (
          info ? (
            <div key={pairId} style={{ display: 'flex', justifyContent: 'space-between', border: '1px solid #3a3a4a', borderRadius: 10, padding: 12, background: '#14141c' }}>
              <div style={{ fontSize: 13, opacity: 0.85 }}>{(info as any).token0} / {(info as any).token1}</div>
              <div style={{ fontSize: 13 }}>LP: {(info as any).balance}</div>
            </div>
          ) : null
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: 13, opacity: 0.85 }}>
        Don’t see your pool? <a href="#" onClick={(e) => { e.preventDefault(); navigate('/pool/import'); }}>Import it</a> ·
        {' '}<a href="#" onClick={(e) => { e.preventDefault(); navigate('/pool/deploy'); }}>Create new pool</a>
      </div>
      <button onClick={() => navigate('/pool/add')} style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #3a3a4a', background: '#2a2a39', color: 'white', marginTop: 12 }}>
        {address ? 'Add Liquidity' : 'Connect wallet to add'}
      </button>
    </div>
  );
}


