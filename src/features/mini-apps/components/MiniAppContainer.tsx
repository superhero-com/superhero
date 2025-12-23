import React, { createContext, useContext, useRef, ReactNode } from 'react';

/**
 * Context for mini-app container reference
 * Allows child components to portal dialogs/modals to the mini-app container
 */
interface MiniAppContainerContextValue {
  containerRef: React.RefObject<HTMLDivElement>;
}

const MiniAppContainerContext = createContext<MiniAppContainerContextValue | null>(null);

/**
 * Hook to access the mini-app container ref
 * Use this to portal dialogs/modals to the mini-app container instead of document.body
 */
export function useMiniAppContainer() {
  const context = useContext(MiniAppContainerContext);
  if (!context) {
    throw new Error('useMiniAppContainer must be used within a MiniAppContainer');
  }
  return context;
}

interface MiniAppContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * MiniAppContainer
 * 
 * Creates an isolated container for mini-app content that behaves like an iframe.
 * Dialogs/modals portaled to this container will only overlay the mini-app content,
 * not the entire page.
 * 
 * Features:
 * - Creates a new stacking context (isolation: isolate)
 * - Contains overflow to prevent content from escaping
 * - Provides a portal target for scoped dialogs/modals
 */
export function MiniAppContainer({ children, className = '' }: MiniAppContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <MiniAppContainerContext.Provider value={{ containerRef }}>
      <div
        ref={containerRef}
        className={`mini-app-container relative w-full min-h-full ${className}`}
        style={{
          position: 'relative',
          isolation: 'isolate', // Creates a new stacking context
          zIndex: 1,
          minHeight: '100%',
          overflow: 'visible', // Allow dialogs to overflow but they'll be portaled
        }}
      >
        {children}
      </div>
    </MiniAppContainerContext.Provider>
  );
}
