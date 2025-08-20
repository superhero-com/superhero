import React from 'react';

interface MobileTestProps {
  isMobile: boolean;
}

export default function MobileTest({ isMobile }: MobileTestProps) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      background: isMobile ? 'red' : 'blue',
      color: 'white',
      padding: '8px 12px',
      zIndex: 9999,
      fontSize: '14px',
      fontWeight: 'bold',
      borderRadius: '0 0 8px 0'
    }}>
      {isMobile ? '📱 MOBILE LAYOUT' : '🖥️ DESKTOP LAYOUT'}
    </div>
  );
}
