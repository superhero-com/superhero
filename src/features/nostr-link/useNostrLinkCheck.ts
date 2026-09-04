import { useCallback, useEffect, useRef } from 'react';
import { useAtom } from 'jotai';

import { useAeSdk } from '@/hooks/useAeSdk';
import { useTransactionNotification } from '@/features/transaction-notification';
import { fetchNostrLink, linkNostrIdentity } from './link-flow';
import { wasDismissedRecently, markDismissed, clearDismissal } from './storage';
import { deriveInlineLinkIdentity, type DeriveLinkIdentity } from './identity-source';
import { nostrLinkStatusAtom } from './state';

export type NostrLinkStatus =
  | 'idle'
  | 'checking'
  | 'linked'
  | 'prompt'
  | 'linking'
  | 'done'
  | 'error';

/**
 * Drives the shared `nostrLinkStatusAtom`: on the first ready account it checks
 * whether the account already has a nostr link and, if not (and not dismissed
 * in the last 24h), raises the prompt. `linkNostr` runs the claim/sign/submit
 * round-trip. The nostr identity comes from `deriveIdentity` (defaults to the
 * inline-wallet vault); injectable so a later stage's chat session can supply
 * its own without reinventing this flow.
 */
export function useNostrLinkCheck(
  deriveIdentity: DeriveLinkIdentity = deriveInlineLinkIdentity,
) {
  const [status, setStatus] = useAtom(nostrLinkStatusAtom);
  // The account the current status reflects. Re-check when it changes so a
  // second wallet never inherits the first's `linked` state; a plain boolean
  // "checked once" would skip the recheck and hide the prompt on switch.
  const checkedAccount = useRef<string | null>(null);

  const { activeAccount, signMessage } = useAeSdk();
  const { notifyError } = useTransactionNotification();

  useEffect(() => {
    if (!activeAccount || checkedAccount.current === activeAccount) return;
    checkedAccount.current = activeAccount;

    (async () => {
      setStatus('checking');
      try {
        const linked = await fetchNostrLink(activeAccount);
        if (linked) {
          setStatus('linked');
          return;
        }
        if (wasDismissedRecently(activeAccount)) {
          setStatus('done');
          return;
        }
        setStatus('prompt');
      } catch {
        setStatus('done');
      }
    })();
  }, [activeAccount, setStatus]);

  const linkNostr = useCallback(async () => {
    if (!activeAccount) return;

    setStatus('linking');
    try {
      const { npub, identity } = await deriveIdentity(activeAccount);
      // `signMessage` routes through the current wallet session — inline or
      // extension / WalletConnect — so the link works for whichever the user has.
      await linkNostrIdentity({
        address: activeAccount, npub, identity, signMessage,
      });
      clearDismissal(activeAccount);
      // `linked`, not `done`: `done` means "unlinked, but resolved for now", and
      // every re-prompt path (`useRequestNostrLinkPrompt`, the unlock check in
      // `useRoomSession`) reopens the dialog on it — so a just-linked account
      // would be asked to enable chat again while the link tx is still settling.
      setStatus('linked');
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to link Nostr identity.');
      setStatus('error');
    }
  }, [activeAccount, signMessage, deriveIdentity, notifyError, setStatus]);

  const dismiss = useCallback(() => {
    if (activeAccount) markDismissed(activeAccount);
    setStatus('done');
  }, [activeAccount, setStatus]);

  const retry = useCallback(() => {
    setStatus('prompt');
  }, [setStatus]);

  return {
    status, linkNostr, dismiss, retry,
  };
}
