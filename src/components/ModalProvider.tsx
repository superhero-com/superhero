import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useModal } from '../hooks';

type Registry = Record<string, React.ComponentType<any>>;

// Simple visually hidden component for accessibility
const VisuallyHidden: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0
  }}>
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
              <Dialog.Overlay 
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.5)',
                  display: 'grid',
                  placeItems: 'center',
                  zIndex: 1001
                }}
              />
              <Dialog.Content
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: '#1c1c24',
                  border: '1px solid #2f2f3b',
                  borderRadius: 8,
                  maxWidth: 520,
                  width: '100%',
                  padding: 16,
                  outline: 'none',
                  zIndex: 1002
                }}
              >
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


