import React, { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useAtom } from 'jotai';
import { transactionsQueueAtom } from '../atoms/txQueueAtoms';

export default function TxQueue() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [transactionsQueue, setTransactionsQueue] = useAtom(transactionsQueueAtom);
  
  useEffect(() => {
    if (!id) return;

    // Parse query parameters
    const query = Object.fromEntries(new URLSearchParams(location.search).entries());
    
    // Update the transactions queue
    setTransactionsQueue(prevQueue => ({
      ...prevQueue,
      [id]: {
        ...prevQueue[id], // Keep existing data
        ...query, // Merge in new query data
      } as any, // Using any here because query can contain various properties
    }));
    
    // Close current tab after a short delay
    const timer = window.setTimeout(() => { 
      window.close(); 
    }, 200);
    
    return () => window.clearTimeout(timer);
  }, [id, location.search, setTransactionsQueue]);

  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="text-white/80 text-lg">Processing transaction…</div>
    </div>
  );
}


