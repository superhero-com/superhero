import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPairDetails, getHistory } from '../libs/dexBackend';
import AeButton from '../components/AeButton';

export default function PoolDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pair, setPair] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const [p, hist] = await Promise.all([
        getPairDetails(id),
        getHistory({ pairAddress: id }),
      ]);
      setPair(p);
      setHistory(hist || []);
    })();
  }, [id]);

  const t0 = pair?.token0;
  const t1 = pair?.token1;
  return (
    <div className="container" style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 0' }}>
      <h2>{pair ? `${t0.symbol} / ${t1.symbol}` : 'Loading pool…'}</h2>
      {pair && (
        <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
          <AeButton onClick={() => navigate(`/swap?from=${t0.address}&to=${t1.address}`)} variant="secondary-dark" size="medium">Swap</AeButton>
          <AeButton onClick={() => navigate(`/pool/add?from=${t0.address}&to=${t1.address}`)} variant="secondary-dark" size="medium">Add Liquidity</AeButton>
        </div>
      )}
      <h3 style={{ marginTop: 16 }}>Transactions</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={{ textAlign: 'left' }}>Type</th><th>Time</th><th>Delta0</th><th>Delta1</th></tr></thead>
          <tbody>
            {history.map((tx: any, idx: number) => (
              <tr key={idx}>
                <td>{tx.type}</td>
                <td>{new Date(tx.microBlockTime).toLocaleString()}</td>
                <td>{tx.delta0}</td>
                <td>{tx.delta1}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


