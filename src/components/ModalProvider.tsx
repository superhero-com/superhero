import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useModal } from '../hooks';

type Registry = Record<string, React.ComponentType<any>>;

// Simple visually hidden component for accessibility
const VisuallyHidden: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0" style={{ clip: 'rect(0, 0, 0, 0)' }}>
    {children}
  </span>
);

export default function ModalProvider({ registry }: { registry: Registry }) {
  const { openedModals, closeModal } = useModal();
  
  return (
    <>
      {Object.entries(registry).map(([modalName, Component]) => {
        // Find if this modal is currently open
        const openModal = openedModals.find(modal => modal.name === modalName);
        const isOpen = !!openModal;
        
        return (
          <Dialog.Root 
          
            key={modalName} 
            open={isOpen} 
            onOpenChange={(open) => { 
              if (!open && openModal) {
                closeModal(openModal.key); 
              }
            }}
          >
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/50 grid place-items-center z-[1001] backdrop-blur-sm" />
              <Dialog.Content className="fixed left-1/2 -translate-x-1/2 bottom-4 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 bg-gray-900 border border-gray-700 rounded-2xl max-w-[520px] w-[calc(100%-24px)] sm:w-full p-6 outline-none z-[1002] shadow-2xl backdrop-blur-xl bg-white/5 border-white/10">
                <VisuallyHidden>
                  <Dialog.Title>{modalName} Modal</Dialog.Title>
                </VisuallyHidden>
                {isOpen && (
                  <Component 
                    {...(openModal?.props || {})} 
                    onClose={() => openModal && closeModal(openModal.key)} 
                  />
                )}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        );
      })}
    </>
  );
}


