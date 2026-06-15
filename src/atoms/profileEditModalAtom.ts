import { atom } from 'jotai';

export const profileEditModalOpenAtom = atom(false);
export const profileEditModalFlowAtom = atom({
  redirectToProfileOnClose: false,
  showSkip: false,
});
export const profileEditModalPendingAfterConnectAtom = atom(false);
