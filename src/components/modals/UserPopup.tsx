import React, { useEffect, useState } from 'react';
import Identicon from '../Identicon';
import { Backend } from '../../api/backend';

export default function UserPopup({ address, onClose }: { address: string; onClose: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  useEffect(() => { Backend.getProfile(address).then(setProfile).catch(() => {}); }, [address]);
  return (
    <div>
      <div style={{ display: 'flex', gap: 12 }}>
        <Identicon address={address} size={56} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{profile?.preferredChainName || 'Legend'}</div>
          <div style={{ fontSize: 12, color: '#c3c3c7' }}>{address}</div>
          {profile?.location && (
            <div style={{ fontSize: 12, color: '#c3c3c7', marginTop: 4 }}>{profile.location}</div>
          )}
        </div>
      </div>
      {profile?.biography && (
        <div style={{ marginTop: 8, fontSize: 13, color: '#c3c3c7', whiteSpace: 'pre-wrap' }}>{profile.biography}</div>
      )}
    </div>
  );
}


