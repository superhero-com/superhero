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
    
    console.log("Transaction", location.search, id);
    
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
    // const timer = window.setTimeout(() => { 
    //   window.close(); 
    // }, 200);
    
    // return () => window.clearTimeout(timer);
  }, [id, location.search, setTransactionsQueue]);

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>Processing transaction…</div>
    </div>
  );
}


