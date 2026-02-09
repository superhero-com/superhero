import React, { useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useAtom } from 'jotai';
import { transactionsQueueAtom } from '../atoms/txQueueAtoms';

const TxQueue = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [, setTransactionsQueue] = useAtom(transactionsQueueAtom);

  useEffect(() => {
    let timer: number | undefined;
    if (id) {
      // Parse query parameters
      const query = Object.fromEntries(new URLSearchParams(location.search).entries());

      // Update the transactions queue
      setTransactionsQueue((prevQueue) => ({
        ...prevQueue,
        [id]: {
          ...prevQueue[id], // Keep existing data
          ...query, // Merge in new query data
        } as any, // Using any here because query can contain various properties
      }));

      // Close current tab after a short delay
      timer = window.setTimeout(() => {
        window.close();
      }, 200);
    }

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [id, location.search, setTransactionsQueue]);

  return (
    <div className="h-screen w-screen flex items-center justify-center">
      <div className="text-white/80 text-lg">Processing transaction…</div>
    </div>
  );
};

export default TxQueue;
