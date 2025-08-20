import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../store/store';
import { close } from '../store/slices/modalsSlice';

type Registry = Record<string, React.ComponentType<any>>;

export default function ModalProvider({ registry }: { registry: Registry }) {
  const opened = useSelector((s: RootState) => s.modals.opened);
  const dispatch = useDispatch();
  return (
    <>
      {opened.map(({ key, name, props }) => {
        const Component = registry[name];
        if (!Component) return null;
        return (
          <div key={key} className="modal-overlay" onClick={() => dispatch(close(key))}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
              <Component {...props} onClose={() => dispatch(close(key))} />
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


