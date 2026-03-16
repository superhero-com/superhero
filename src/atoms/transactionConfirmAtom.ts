import { atom } from 'jotai';

export type TransactionType = 'trade' | null;

export const transactionTypeAtom = atom<TransactionType>(null as TransactionType);
