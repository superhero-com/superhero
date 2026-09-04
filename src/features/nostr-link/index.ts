export { useNostrLinkCheck } from './useNostrLinkCheck';
export type { NostrLinkStatus } from './useNostrLinkCheck';
export { useRequestNostrLinkPrompt } from './useRequestNostrLinkPrompt';
export { EnableChatDialog } from './EnableChatDialog';
export { NostrLinkGate } from './NostrLinkGate';
export { linkNostrIdentity, fetchNostrLink } from './link-flow';
export type { LinkNostrParams, NostrClaimResult, SignMessageFn } from './link-flow';
export { deriveInlineLinkIdentity } from './identity-source';
export type { DeriveLinkIdentity, LinkNostrIdentity } from './identity-source';
// Shared status atom — drives the root-mounted EnableChatDialog (NostrLinkGate).
// Consumers (e.g. the Stage 3 "enable posting" flow) flip it to `'prompt'` to
// open the canonical link dialog and observe `'linked'` for success.
export { nostrLinkStatusAtom } from './state';
