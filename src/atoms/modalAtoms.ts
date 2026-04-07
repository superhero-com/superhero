import { atom } from 'jotai';

export interface ModalItem {
  key: number;
  name: string;
  props?: Record<string, any>;
}

export const openedModalsAtom = atom<ModalItem[]>([]);
