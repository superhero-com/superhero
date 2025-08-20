import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useParams, useLocation } from 'react-router-dom';
import { upsert } from '../store/slices/txQueueSlice';

export default function TxQueue() {
  const { id } = useParams();
  const location = useLocation();
  const dispatch = useDispatch();

  useEffect(() => {
    if (!id) return;
    const query = Object.fromEntries(new URLSearchParams(location.search).entries());
    dispatch(upsert({ id, data: query }));
    const timer = window.setTimeout(() => { window.close(); }, 200);
    return () => window.clearTimeout(timer);
  }, [id, location.search, dispatch]);

  return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>Processing transaction…</div>
    </div>
  );
}


