import React, { createContext, useContext, useState, useEffect } from 'react';

export type LayoutVariant = 'minimal' | 'clean' | 'ultra-minimal' | 'default';

interface LayoutVariantContextType {
  variant: LayoutVariant;
  setVariant: (variant: LayoutVariant) => void;
}

const LayoutVariantContext = createContext<LayoutVariantContextType | undefined>(undefined);

export function LayoutVariantProvider({ children }: { children: React.ReactNode }) {
  const [variant, setVariantState] = useState<LayoutVariant>(() => {
    // Load from localStorage or default to 'clean'
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('layoutVariant') as LayoutVariant;
      if (saved && ['minimal', 'clean', 'ultra-minimal', 'default'].includes(saved)) {
        return saved;
      }
    }
    return 'clean';
  });

  const setVariant = (newVariant: LayoutVariant) => {
    setVariantState(newVariant);
    if (typeof window !== 'undefined') {
      localStorage.setItem('layoutVariant', newVariant);
      // Apply variant class to body for global styles
      document.body.className = document.body.className
        .replace(/layout-variant-[\w-]+/g, '')
        .trim();
      document.body.classList.add(`layout-variant-${newVariant}`);
    }
  };

  useEffect(() => {
    // Apply variant class on mount
    document.body.classList.add(`layout-variant-${variant}`);
    return () => {
      document.body.classList.remove(`layout-variant-${variant}`);
    };
  }, [variant]);

  return (
    <LayoutVariantContext.Provider value={{ variant, setVariant }}>
      {children}
    </LayoutVariantContext.Provider>
  );
}

export function useLayoutVariant() {
  const context = useContext(LayoutVariantContext);
  if (context === undefined) {
    throw new Error('useLayoutVariant must be used within a LayoutVariantProvider');
  }
  return context;
}

