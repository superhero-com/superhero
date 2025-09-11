import React from 'react';
import { cn } from '../../lib/utils';

interface MobileTestProps {
  isMobile: boolean;
}

export default function MobileTest({ isMobile }: MobileTestProps) {
  return (
    <div className={cn(
      'fixed top-0 left-0 text-white px-3 py-2 z-[9999] text-sm font-bold rounded-br-lg',
      isMobile ? 'bg-red-500' : 'bg-blue-500'
    )}>
      {isMobile ? '📱 MOBILE LAYOUT' : '🖥️ DESKTOP LAYOUT'}
    </div>
  );
}
