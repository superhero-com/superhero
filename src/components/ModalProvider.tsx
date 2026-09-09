import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import { useModal } from '../hooks';
import { useKeyboardInset } from '../hooks/useKeyboardInset';

type Registry = Record<string, React.ComponentType<any>>;

// Simple visually hidden component for accessibility
const VisuallyHidden: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0" style={{ clip: 'rect(0, 0, 0, 0)' }}>
    {children}
  </span>
);

const ModalProvider = ({ registry }: { registry: Registry }) => {
  const { t } = useTranslation();
  const { openedModals, closeModal } = useModal();
  const { inset, visibleHeight } = useKeyboardInset();

  /**
   * Lift the sheet clear of the keyboard and cap it to what is left, so a form
   * taller than the gap scrolls instead of extending underneath. Applied only
   * while a keyboard is up: `top`/`transform` are restated because the wide
   * layout centres vertically, and bottom-anchoring has to win while typing.
   *
   * The cap comes from the same measurement as the offset. `100vh` would not:
   * it is the large viewport, so it overshoots by the height of a shown URL bar
   * and the sheet grows past the gap instead of scrolling inside it.
   */
  const liftedAboveKeyboard: React.CSSProperties | undefined = inset
    ? {
      top: 'auto',
      bottom: `calc(1rem + ${inset}px)`,
      transform: 'translateX(-50%)',
      maxHeight: `calc(${visibleHeight}px - 2rem)`,
      overflowY: 'auto',
    }
    : undefined;

  return (
    <>
      {Object.entries(registry).map(([modalName, Component]) => {
        // Find if this modal is currently open
        const openModal = openedModals.find((modal) => modal.name === modalName);
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
              <Dialog.Overlay className="fixed inset-0 bg-black/50 grid place-items-center z-[2001] backdrop-blur-sm" />
              <Dialog.Content
                className="fixed left-1/2 -translate-x-1/2 bottom-4 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 border border-white/10 rounded-2xl max-w-[520px] w-[calc(100%-24px)] sm:w-full p-6 outline-none z-[2002] shadow-2xl bg-white/5 supports-not-[backdrop-filter]:bg-gray-900/90 [backdrop-filter:blur(24px)] [-webkit-backdrop-filter:blur(24px)]"
                style={liftedAboveKeyboard}
              >
                <VisuallyHidden>
                  <Dialog.Title>
                    {t('common.modals.titleSuffix', { name: modalName })}
                  </Dialog.Title>
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
};

export default ModalProvider;
