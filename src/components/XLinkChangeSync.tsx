import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { activeAccountAtom } from '@/atoms/accountAtoms';
import { useRefreshXLinkState } from '@/hooks/useRefreshXLinkState';
import {
  TxPayloadType,
  useTransactionNotification,
  type NotificationState,
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
 * Whether the banner is showing this change exactly, not just any link or
 * unlink: every stored wallet is polled, and one wallet's change must never
 * settle or clear another's.
 */
function bannerShowsChange(banner: NotificationState, change: PendingXLinkChange): boolean {
  if (banner.status !== 'pending') return false;
  const { payload } = banner;
  return payload.type === xLinkChangePayload(change).type
    && 'startedAt' in payload
    && payload.startedAt === change.startedAt;
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
    const bannerShowsIt = bannerShowsChange(banner, change);
    if (outcome === 'timed_out') {
      // Nothing true to announce; stop claiming it is on its way.
      if (bannerShowsIt) dismissNotification();
      return;
    }
    // Only ever to the wallet it happened to. Another transaction owning the
    // banner, or another wallet connected: the screens update, the banner
    // is left alone.
    if (address !== accountRef.current) return;
    if (bannerShowsIt || banner.status === 'idle') notifyConfirmed(payload);
  }), [dismissNotification, notifyConfirmed, refreshXLinkState]);

  // Once per wallet: after a reload the banner starts empty, so show the
  // change still on its way. Not again after it is dismissed. On a switch to
  // another wallet (or none), the previous wallet's wait is not this one's:
  // clear it, and show the new wallet's own wait if it has one.
  const restoredFor = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const account = activeAccount || null;
    if (restoredFor.current === account) return;
    restoredFor.current = account;
    const change = pendingXLinkChange(account);
    const banner = bannerRef.current;
    const bannerIsXLinkChange = banner.status === 'pending'
      && (banner.payload.type === TxPayloadType.LinkX
        || banner.payload.type === TxPayloadType.UnlinkX);
    if (change && bannerShowsChange(banner, change)) return;
    if (bannerIsXLinkChange) dismissNotification();
    if (change && (banner.status === 'idle' || bannerIsXLinkChange)) {
      notifyPending(xLinkChangePayload(change));
    }
  }, [activeAccount, dismissNotification, notifyPending]);

  return null;
};

export default XLinkChangeSync;
