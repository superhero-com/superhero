import React from 'react';
import Identicon from '../Identicon';

export default function UserCard({ address, name, bio, onClose }: { address: string; name?: string; bio?: string; onClose: () => void }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 12 }}>
        <Identicon address={address} size={48} />
        <div>
          <div style={{ fontWeight: 700 }}>{name || address}</div>
          <div style={{ opacity: 0.7, fontSize: 12 }}>{address}</div>
        </div>
      </div>
      {bio && <p style={{ marginTop: 8 }}>{bio}</p>}
    </div>
  );
}


