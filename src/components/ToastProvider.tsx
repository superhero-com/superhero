import React, {
  createContext, useCallback, useContext, useMemo, useState,
} from 'react';

type Toast = { id: number; message: React.ReactNode };
type ToastCtx = { push: (message: React.ReactNode) => void };
const Ctx = createContext<ToastCtx>({ push: () => {} });

export function useToast() { return useContext(Ctx); }

const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: React.ReactNode) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);
  const contextValue = useMemo(() => ({ push }), [push]);
  return (
    <Ctx.Provider value={contextValue}>
      {children}
      <div style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        display: 'grid',
        gap: 8,
      }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              background: '#333',
              color: '#fff',
              padding: '8px 12px',
              borderRadius: 6,
              maxWidth: 360,
            }}
          >
            <div style={{ display: 'grid', gap: 6 }}>{t.message}</div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
};

export default ToastProvider;
