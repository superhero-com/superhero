import React, { useEffect } from 'react';

export type LayoutVariant = 'flush';

export function LayoutVariantProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Always apply flush variant
    document.body.classList.add('layout-variant-flush');
    return () => {
      document.body.classList.remove('layout-variant-flush');
    };
  }, []);

  return <>{children}</>;
}

