import { atom } from 'jotai';

// Aeternity SDK state atoms
export const sdkAtom = atom<any | null>(null);
export const useSdkWalletAtom = atom<boolean>(false);
export const useIframeWalletAtom = atom<boolean>(false);

// SDK connection status derived atom
export const sdkConnectedAtom = atom((get) => {
  const sdk = get(sdkAtom);
  return sdk !== null && (window as any).__aeSdk !== undefined;
});
