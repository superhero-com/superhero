import { atom } from 'jotai';

export type TipPhase = 'pending' | 'success' | 'error';

export const tipStatusAtom = atom<Record<string, { status: TipPhase; updatedAt: number }>>({});

export function makeTipKey(toAddress: string, postId: string): string {
  const normalized = String(postId).endsWith('_v3') ? String(postId) : `${postId}_v3`;
  return `${toAddress}|${normalized}`;
}
