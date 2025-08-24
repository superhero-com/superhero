import { atom } from 'jotai';

export interface ModalItem {
  key: number;
  name: string;
  props?: Record<string, any>;
}

// Modal management atom
export const openedModalsAtom = atom<ModalItem[]>([]);

// Counter for modal keys
let modalCounter = 0;

// Derived atom for modal operations
export const modalActionsAtom = atom(
  null,
  (get, set, action: { type: 'open'; modal: Omit<ModalItem, 'key'> } | { type: 'close'; key: number }) => {
    const currentModals = get(openedModalsAtom);
    
    switch (action.type) {
      case 'open':
        set(openedModalsAtom, [...currentModals, { ...action.modal, key: modalCounter++ }]);
        break;
      case 'close':
        set(openedModalsAtom, currentModals.filter((m) => m.key !== action.key));
        break;
    }
  }
);
