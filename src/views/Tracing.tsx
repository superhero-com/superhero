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
    <div className="max-w-[980px] mx-auto p-4">
      <h2 className="text-2xl font-bold text-white mb-4">Tracing {tipId}</h2>
      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-sm font-mono border border-gray-700">
        {JSON.stringify({ backendTrace, chainTrace }, null, 2)}
      </pre>
    </div>
  );
}


