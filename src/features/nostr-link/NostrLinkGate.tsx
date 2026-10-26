import { useNostrLinkCheck } from './useNostrLinkCheck';
import { EnableChatDialog } from './EnableChatDialog';

/**
 * Mounts near the app root. Checks whether the active æ account has a linked
 * nostr identity and, if not, shows the "Enable Chat" prompt.
 */
export const NostrLinkGate = () => {
  const {
    status, linkNostr, dismiss, retry,
  } = useNostrLinkCheck();

  return (
    <>
      {status === 'check-error' && (
        <div role="alert" className="fixed bottom-24 left-1/2 z-50 w-[min(90vw,28rem)] -translate-x-1/2 rounded-xl border bg-background p-4 text-sm shadow-lg">
          Could not check your chat registration. Please try again.
          <button type="button" className="ml-2 font-semibold text-primary underline" onClick={retry}>
            Retry
          </button>
        </div>
      )}
      <EnableChatDialog status={status} onEnable={linkNostr} onDismiss={dismiss} />
    </>
  );
};
