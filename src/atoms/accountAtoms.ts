import { atomWithStorage } from 'jotai/utils';


export const activeAccountAtom = atomWithStorage<string | undefined>('account:activeAccount', undefined);