import React, { useState } from 'react';
import AeButton from '../AeButton';
import { Backend } from '../../api/backend';

import { useWallet } from '../../hooks';
export default function FeedItemMenu({ tipId, postId, url, author, onClose }: { tipId?: string; postId?: string; url: string; author: string; onClose: () => void }) {
  const address = useWallet().address as string;
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const id = tipId || postId;
  return (
    <div>
      <h3>Item actions</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        {/* Claim action removed as requested */}
        <AeButton onClick={async () => { setLoading(true); try { await Backend.pinItem(address, { url, tipId: id }); alert('Pinned'); onClose(); } finally { setLoading(false); } }}>Pin</AeButton>
        <AeButton onClick={async () => { setLoading(true); try { await Backend.unPinItem(address, { url, tipId: id }); alert('Unpinned'); onClose(); } finally { setLoading(false); } }}>Unpin</AeButton>
        <div>
          <label htmlFor="report-reason" style={{ display: 'none' }}>Report reason</label>
          <input id="report-reason" name="reportReason" placeholder="Report reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <AeButton onClick={async () => { setLoading(true); try { await Backend.sendPostReport(address, { url, reason }); alert('Reported'); onClose(); } finally { setLoading(false); } }}>Report</AeButton>
        </div>
      </div>
    </div>
  );
}


