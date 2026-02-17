import React from 'react';
import AeButton from '../AeButton';

const CookiesDialog = ({ onClose }: { onClose: () => void }) => (
  <div className="p-2">
    <h3 className="text-xl font-bold text-white mb-3">Cookies</h3>
    <p className="text-white/80 mb-4 leading-relaxed">We use local storage for preferences. Allow?</p>
    <div className="flex gap-2">
      <AeButton onClick={onClose}>Close</AeButton>
      <AeButton
        green
        onClick={async () => {
          await (dispatch as any)(setCookies({ scope: 'analytics', status: true }));
          onClose();
        }}
      >
        Allow
      </AeButton>
    </div>
  </div>
);

export default CookiesDialog;
