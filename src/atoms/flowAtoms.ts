import { atomWithStorage } from 'jotai/utils';
import type { FlowRecordMap } from '@/features/flow-watcher/types';

export const flowRecordsAtom = atomWithStorage<FlowRecordMap>('flow:records', {});
