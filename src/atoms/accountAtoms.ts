import { safeLocalJSONStorage } from '@/utils/jotaiSafeLocalStorage';
import { atomWithStorage } from 'jotai/utils';

export const activeAccountAtom = atomWithStorage<string | undefined>(
  'account:activeAccount',
  undefined,
  safeLocalJSONStorage,
);
