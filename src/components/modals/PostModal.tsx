import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AeButton from '../AeButton';
import type { RootState } from '../../store/store';
import { callWithAuth } from '../../store/slices/backendSlice';

export default function PostModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [media, setMedia] = useState('');
  const [loading, setLoading] = useState(false);
  const useSdkWallet = useSelector((s: RootState) => s.aeternity.useSdkWallet);
  const address = useSelector((s: RootState) => s.root.address) as string | null;
  const dispatch = useDispatch();
  return (
    <div>
      <h3>Create Post</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input placeholder="Media URL (optional)" value={media} onChange={(e) => setMedia(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <AeButton onClick={onClose}>Cancel</AeButton>
        <AeButton
          green
          disabled={!title}
          loading={loading}
          onClick={async () => {
            setLoading(true);
            try {
              if (!address) { alert('Please connect a wallet first.'); return; }
              await (dispatch as any)(callWithAuth({ method: 'sendPostWithoutTip' as any, arg: { title, media } }));
              onClose();
            } catch (e) {
              console.error(e);
            } finally {
              setLoading(false);
            }
          }}
        >Post</AeButton>
      </div>
    </div>
  );
}


