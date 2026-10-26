import {
  useCallback, useEffect, useRef, useState,
} from 'react';
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
  | 'check-error'
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
  const [checkAttempt, setCheckAttempt] = useState(0);
  const generation = useRef(0);

  const { activeAccount, signMessage } = useAeSdk();
  const { notifyError } = useTransactionNotification();

  useEffect(() => {
    generation.current += 1;
    const { current } = generation;
    if (!activeAccount) {
      setStatus('idle');
      return undefined;
    }
    setStatus('checking');
    (async () => {
      try {
        const linked = await fetchNostrLink(activeAccount);
        if (generation.current !== current) return;
        setStatus((previous) => {
          if (previous === 'linked' || previous === 'linking') return previous;
          if (linked) return 'linked';
          return wasDismissedRecently(activeAccount) ? 'done' : 'prompt';
        });
      } catch {
        if (generation.current === current) {
          setStatus((previous) => (previous === 'linked' || previous === 'linking' ? previous : 'check-error'));
        }
      }
    })();
    return () => { generation.current += 1; };
  }, [activeAccount, checkAttempt, setStatus]);

  const retry = useCallback(() => setCheckAttempt((attempt) => attempt + 1), []);
  useEffect(() => {
    if (status !== 'check-error') return undefined;
    window.addEventListener('online', retry);
    return () => window.removeEventListener('online', retry);
  }, [status, retry]);

  const linkNostr = useCallback(async () => {
    if (!activeAccount || status === 'linking' || status === 'linked') return;
    generation.current += 1;
    const { current } = generation;
    setStatus('linking');
    try {
      const { npub, identity } = await deriveIdentity(activeAccount);
      if (generation.current !== current) return;
      // `signMessage` routes through the current wallet session — inline or
      // extension / WalletConnect — so the link works for whichever the user has.
      await linkNostrIdentity({
        address: activeAccount, npub, identity, signMessage,
      });
      if (generation.current !== current) return;
      clearDismissal(activeAccount);
      // `linked`, not `done`: `done` means "unlinked, but resolved for now", and
      // every re-prompt path (`useRequestNostrLinkPrompt`, the unlock check in
      // `useRoomSession`) reopens the dialog on it — so a just-linked account
      // would be asked to enable chat again while the link tx is still settling.
      setStatus('linked');
    } catch (err) {
      if (generation.current !== current) return;
      notifyError(err instanceof Error ? err.message : 'Failed to link Nostr identity.');
      setStatus('error');
    }
  }, [activeAccount, status, signMessage, deriveIdentity, notifyError, setStatus]);

  const dismiss = useCallback(() => {
    if (activeAccount) markDismissed(activeAccount);
    setStatus('done');
  }, [activeAccount, setStatus]);

  return {
    status, linkNostr, dismiss, retry,
  };
}
