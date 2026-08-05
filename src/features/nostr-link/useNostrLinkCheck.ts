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
  const hasChecked = useRef(false);

  const { activeAccount, signMessage } = useAeSdk();
  const { notifyError } = useTransactionNotification();

  useEffect(() => {
    if (!activeAccount || hasChecked.current) return;
    hasChecked.current = true;

    (async () => {
      setStatus('checking');
      try {
        const linked = await fetchNostrLink(activeAccount);
        if (linked) {
          setStatus('linked');
          return;
        }
        if (wasDismissedRecently()) {
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
      clearDismissal();
      setStatus('done');
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Failed to link Nostr identity.');
      setStatus('error');
    }
  }, [activeAccount, signMessage, deriveIdentity, notifyError, setStatus]);

  const dismiss = useCallback(() => {
    markDismissed();
    setStatus('done');
  }, [setStatus]);

  const retry = useCallback(() => {
    setStatus('prompt');
  }, [setStatus]);

  return {
    status, linkNostr, dismiss, retry,
  };
}
