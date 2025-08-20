import React from 'react';
import AeButton from '../AeButton';

export default function AlertModal({ title, body, failure, onClose }: { title?: string; body?: string; failure?: boolean; onClose: () => void }) {
  return (
    <div>
      <h3>{title || (failure ? 'Something went wrong' : 'Success')}</h3>
      {body && <p>{body}</p>}
      <div style={{ textAlign: 'right' }}>
        <AeButton onClick={onClose}>Close</AeButton>
      </div>
    </div>
  );
}


