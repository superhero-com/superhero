import { atom } from 'jotai';
import { ICommunityFactorySchema } from '../utils/types';

// Factory schema state atom
export const activeFactorySchemaAtom = atom<ICommunityFactorySchema | null>(null);
