import { useNostrLinkCheck } from './useNostrLinkCheck';
import { EnableChatDialog } from './EnableChatDialog';

/**
 * Mounts near the app root. Checks whether the active æ account has a linked
 * nostr identity and, if not, shows the "Enable Chat" prompt.
 */
export const NostrLinkGate = () => {
  const { status, linkNostr, dismiss } = useNostrLinkCheck();

  return (
    <EnableChatDialog status={status} onEnable={linkNostr} onDismiss={dismiss} />
  );
};
