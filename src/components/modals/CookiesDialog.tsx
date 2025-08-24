import React from 'react';
import AeButton from '../AeButton';

export default function CookiesDialog({ onClose }: { onClose: () => void }) {
    return (
    <div>
      <h3>Cookies</h3>
      <p>We use local storage for preferences. Allow?</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <AeButton onClick={onClose}>Close</AeButton>
        <AeButton green onClick={async () => { await (dispatch as any)(setCookies({ scope: 'analytics', status: true })); onClose(); }}>Allow</AeButton>
      </div>
    </div>
  );
}


