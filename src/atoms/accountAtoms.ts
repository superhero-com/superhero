import { safeLocalJSONStorage } from '@/utils/jotaiSafeLocalStorage';
import { atomWithStorage } from 'jotai/utils';

export const activeAccountAtom = atomWithStorage<string | undefined>(
  'account:activeAccount',
  undefined,
  safeLocalJSONStorage,
  // Hydrate synchronously on first read: wallet reconnection on page refresh
  // must see the persisted account before App's init effect runs.
  { getOnInit: true },
);
