import React from 'react';
import { useModal } from '../hooks';

type Registry = Record<string, React.ComponentType<any>>;

export default function ModalProvider({ registry }: { registry: Registry }) {
  const { openedModals, closeModal } = useModal();
  return (
    <>
      {openedModals.map(({ key, name, props }) => {
        const Component = registry[name];
        if (!Component) return null;
        return (
          <div key={key} className="modal-overlay" onClick={() => closeModal(key)}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
              <Component {...props} onClose={() => closeModal(key)} />
            </div>
          </div>
        );
      })}
      <style>{`
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:grid;place-items:center;z-index:500}
        .modal-dialog{background:#1c1c24;border:1px solid #2f2f3b;border-radius:8px;max-width:520px;width:100%;padding:16px}
      `}</style>
    </>
  );
}


