import { atom } from 'jotai';
import { Decimal } from '@/libs/decimal';

export type TransactionType = 'trade' | 'create-token' | null;

export const transactionTypeAtom = atom<TransactionType>(null as TransactionType);

export interface CreateTokenDetails {
  tokenName: string;
  inputMode: 'AE' | 'TOKEN';
  aeAmount?: string;
  tokenAmount?: string;
  estimatedCost?: Decimal;
  estimatedTokens?: Decimal;
}

export const createTokenDetailsAtom = atom<CreateTokenDetails | null>(null as CreateTokenDetails | null);
