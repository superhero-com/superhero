import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTokenWithUsd, getPairsByToken, getPairsByTokenUsd, getHistory } from '../libs/dexBackend';
import AeButton from '../components/AeButton';

export default function TokenDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [token, setToken] = useState<any | null>(null);
  const [pairsUsd, setPairsUsd] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const [t, pUsd, hist] = await Promise.all([
        getTokenWithUsd(id),
        getPairsByTokenUsd(id),
        getHistory({ tokenAddress: id }),
      ]);
      setToken(t);
      setPairsUsd(pUsd || []);
      setHistory(hist || []);
    })();
  }, [id]);

  return (
    <div className="container" style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 0' }}>
      <h2>{token ? `#${token.symbol} / #${token.name}` : 'Loading token…'}</h2>
              <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
          <AeButton onClick={() => navigate(`/swap?from=AE&to=${id}`)} variant="secondary-dark" size="medium">Swap</AeButton>
          <AeButton onClick={() => navigate(`/pool/add?from=AE&to=${id}`)} variant="secondary-dark" size="medium">Add Liquidity</AeButton>
        </div>
      <h3 style={{ marginTop: 16 }}>Pools</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr><th style={{ textAlign: 'left' }}>Pair</th><th>Address</th></tr></thead>
          <tbody>
            {pairsUsd.map((p: any) => (
              <tr key={p.address}>
                <td>{p.token0Symbol} / {p.token1Symbol}</td>
                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{p.address}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


