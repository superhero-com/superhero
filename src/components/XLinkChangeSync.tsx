import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { activeAccountAtom } from '@/atoms/accountAtoms';
import { useRefreshXLinkState } from '@/hooks/useRefreshXLinkState';
import {
  TxPayloadType,
  useTransactionNotification,
  type TxPayload,
} from '@/features/transaction-notification';
import {
  onXLinkChangeSettled,
  pendingXLinkChange,
  resumeXLinkChanges,
  type PendingXLinkChange,
} from '@/utils/confirmedXLink';

/** The banner payload for a pending X link change. */
export function xLinkChangePayload(change: PendingXLinkChange): TxPayload {
  return change.kind === 'link'
    ? { type: TxPayloadType.LinkX, startedAt: change.startedAt }
    : { type: TxPayloadType.UnlinkX, startedAt: change.startedAt };
}

/**
 * Carries X link changes across the whole app, and across reloads.
 *
 * - Picks up changes a previous page load left pending, so a reload keeps
 *   waiting on them instead of showing the account's old state as current.
 * - When one settles, refetches everything that shows the X link, whichever
 *   page is open, and turns the banner into "X account linked/unlinked".
 * - After a reload, puts the pending change back in the banner for the
 *   connected wallet, with how long it has been so far.
 */
export const XLinkChangeSync = () => {
  const refreshXLinkState = useRefreshXLinkState();
  const activeAccount = useAtomValue(activeAccountAtom);
  const {
    notificationState, notifyPending, notifyConfirmed, dismissNotification,
  } = useTransactionNotification();
  // Read at settle time, not captured when the listener was registered.
  const bannerRef = useRef(notificationState);
  bannerRef.current = notificationState;
  const accountRef = useRef(activeAccount);
  accountRef.current = activeAccount;

  useEffect(() => { resumeXLinkChanges(); }, []);

  useEffect(() => onXLinkChangeSettled(({ address, change, outcome }) => {
    refreshXLinkState(address);
    const payload = xLinkChangePayload(change);
    const banner = bannerRef.current;
    const bannerShowsIt = banner.status === 'pending' && banner.payload.type === payload.type;
    if (outcome === 'timed_out') {
      // Nothing true to announce; stop claiming it is on its way.
      if (bannerShowsIt) dismissNotification();
      return;
    }
    // Another transaction owns the banner, or this wallet is not the one
    // connected any more: the screens update, the banner is left alone.
    if (bannerShowsIt || (banner.status === 'idle' && address === accountRef.current)) {
      notifyConfirmed(payload);
    }
  }), [dismissNotification, notifyConfirmed, refreshXLinkState]);

  // Once per wallet: after a reload the banner starts empty, so show the
  // change still on its way. Not again after it is dismissed.
  const restoredFor = useRef<string | null>(null);
  useEffect(() => {
    if (!activeAccount || restoredFor.current === activeAccount) return;
    restoredFor.current = activeAccount;
    const change = pendingXLinkChange(activeAccount);
    if (change && bannerRef.current.status === 'idle') notifyPending(xLinkChangePayload(change));
  }, [activeAccount, notifyPending]);

  return null;
};

export default XLinkChangeSync;
