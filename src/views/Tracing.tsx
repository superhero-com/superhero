import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Backend } from '../api/backend';

export default function Tracing() {
  const { tipId } = useParams();
  const [backendTrace, setBackendTrace] = useState<any>(null);
  const [chainTrace, setChainTrace] = useState<any>(null);
  useEffect(() => {
    if (!tipId) return;
    Backend.getTipTraceBackend(tipId).then(setBackendTrace);
    Backend.getTipTraceBlockchain(tipId).then(setChainTrace);
  }, [tipId]);
  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: 16 }}>
      <h2>Tracing {tipId}</h2>
      <pre>{JSON.stringify({ backendTrace, chainTrace }, null, 2)}</pre>
    </div>
  );
}


