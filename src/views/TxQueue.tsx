import React, { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';

export default function TxQueue() {
  const { id } = useParams();
  const location = useLocation();
  
  useEffect(() => {
    if (!id) return;
    const query = Object.fromEntries(new URLSearchParams(location.search).entries());
    upsertEntry({ id, data: query });
    const timer = window.setTimeout(() => { window.close(); }, 200);
    return () => window.clearTimeout(timer);
  }, [id, location.search, dispatch]);

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>Processing transaction…</div>
    </div>
  );
}


