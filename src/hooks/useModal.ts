import { useAtom } from 'jotai';
import { useCallback } from 'react';
import { openedModalsAtom, modalActionsAtom, ModalItem } from '../atoms/modalAtoms';

export const useModal = () => {
  const [openedModals, setOpenedModals] = useAtom(openedModalsAtom);

  const openModal = useCallback((modal: Omit<ModalItem, 'key'>) => {
    const key = Date.now();
    setOpenedModals((prev) => [...prev, { ...modal, key }]);
  }, []);

  const closeModal = useCallback((key: number) => {
    setOpenedModals((prev) => prev.filter((modal) => modal.key !== key));
  }, []);

  const closeAllModals = useCallback(() => {
    openedModals.forEach((modal) => {
      closeModal(modal.key);
    });
  }, [openedModals, closeModal]);

  return {
    // State
    openedModals,

    // Actions
    openModal,
    closeModal,
    closeAllModals,
  };
};
