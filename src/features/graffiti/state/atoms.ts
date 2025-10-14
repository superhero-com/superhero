import { atom } from 'jotai';

export type OriginalImage = {
  src: string | null;
  width: number;
  height: number;
  type: string | null;
  file: File | null;
};

export type TransformedImage = {
  src: string | null;
  width: number;
  height: number;
  progress: number;
  dronetime: number;
};

export type Settings = {
  scaleFactor: number;
  MAX_SCALING: number;
  threshold: number;
  color: string;
  hysteresisHighThreshold: number;
  centerline: boolean;
  blurKernel: number;
  binaryThreshold: number;
  dilationRadius: number;
  strokeWidth: number;
};

export const firstTimeOpenedAtom = atom(true);
export const firstTimeRenderAtom = atom(true);

export const originalImageAtom = atom<OriginalImage>({
  src: null,
  width: 0,
  height: 0,
  type: null,
  file: null,
});

export const transformedImageAtom = atom<TransformedImage>({
  src: null,
  width: 0,
  height: 0,
  progress: -1,
  dronetime: -1,
});

export const settingsAtom = atom<Settings>({
  scaleFactor: 2,
  MAX_SCALING: 4,
  threshold: 50,
  color: '#f7296e',
  hysteresisHighThreshold: 50,
  centerline: false,
  blurKernel: 3,
  binaryThreshold: 45,
  dilationRadius: 6,
  strokeWidth: 100,
});

export const positionAtom = atom({ x: 0, y: 0 });

export type BidState = {
  slotId: number | null;
  amountAe: number | null; // AE amount
};

export const bidAtom = atom<BidState>({ slotId: null, amountAe: null });


