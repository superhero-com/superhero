import React, { createContext, useContext, useEffect, useState } from 'react';

export type LayoutVariant = 'dashboard' | 'focus' | 'minimal';

interface LayoutVariantContextType {
  variant: LayoutVariant;
  setVariant: (variant: LayoutVariant) => void;
}

const LayoutVariantContext = createContext<LayoutVariantContextType | undefined>(undefined);

export function useLayoutVariant() {
  const context = useContext(LayoutVariantContext);
  if (!context) {
    throw new Error('useLayoutVariant must be used within a LayoutVariantProvider');
  }
  return context;
}

export function LayoutVariantProvider({ children }: { children: React.ReactNode }) {
  const [variant, setVariant] = useState<LayoutVariant>(() => {
    try {
      const saved = localStorage.getItem('layout_variant');
      // Default to 'dashboard' if no saved preference or invalid value
      return (saved === 'dashboard' || saved === 'focus' || saved === 'minimal') ? saved : 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  useEffect(() => {
    // Persist to localStorage
    try {
      localStorage.setItem('layout_variant', variant);
    } catch (e) {
      // ignore
    }

    // Apply classes to body for global styling if needed
    document.body.classList.remove('layout-dashboard', 'layout-focus', 'layout-minimal');
    document.body.classList.add(`layout-${variant}`);
    
    // Always apply flush variant as per previous code
    document.body.classList.add('layout-variant-flush');

    return () => {
      // Cleanup is tricky if we unmount, but usually this provider is at root
    };
  }, [variant]);

  return (
    <LayoutVariantContext.Provider value={{ variant, setVariant }}>
      {children}
    </LayoutVariantContext.Provider>
  );
}
