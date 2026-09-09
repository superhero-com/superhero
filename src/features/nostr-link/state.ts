import { atom } from 'jotai';
import type { NostrLinkStatus } from './useNostrLinkCheck';

// Shared status atom — drives the root-mounted EnableChatDialog (NostrLinkGate).
// Kept verbatim from the app so Stage 3's "enable posting" flow can flip it to
// `'prompt'` to open the canonical link dialog and observe `'linked'`.
export const nostrLinkStatusAtom = atom<NostrLinkStatus>('idle');
