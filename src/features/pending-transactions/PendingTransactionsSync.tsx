import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { useQueryClient } from '@tanstack/react-query';
import { activeAccountAtom } from '@/atoms/accountAtoms';
import { useRefreshXLinkState } from '@/hooks/useRefreshXLinkState';
import { useTransactionNotification } from '@/features/transaction-notification';
// Each kind's module registers how to tell that it is live; they must be
// loaded before anything is resumed.
import '@/utils/confirmedXLink';
import '@/features/trending/utils/pendingTokenCreation';
import {
  findPendingTransaction,
  onPendingTransactionSettled,
  resumePendingTransactions,
} from './store';
import {
  bannerShowsTransaction,
  isTrackedBanner,
  pendingTransactionPayload,
} from './payload';

/**
 * Carries pending transactions across the whole app, and across reloads.
 *
 * - Picks up what a previous page load left pending, so a reload keeps
 *   waiting on it instead of showing the old state as current.
 * - When one is live, refetches what shows it, whichever page is open, and
 *   turns the banner into "done" (X account linked, token created…).
 * - Puts the connected wallet's pending transaction back in the banner after
 *   a reload or a wallet switch, and never shows one wallet's to another.
 */
export const PendingTransactionsSync = () => {
  const queryClient = useQueryClient();
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

  useEffect(() => { resumePendingTransactions(); }, []);

  useEffect(() => onPendingTransactionSettled(({ transaction, outcome }) => {
    if (transaction.kind === 'create_token') {
      queryClient.invalidateQueries({ queryKey: ['TokensService.findByAddress'] });
    } else {
      refreshXLinkState(transaction.account);
    }
    const banner = bannerRef.current;
    const bannerShowsIt = bannerShowsTransaction(banner, transaction);
    if (outcome === 'timed_out') {
      // Nothing true to announce; stop claiming it is on its way.
      if (bannerShowsIt) dismissNotification();
      return;
    }
    // Only ever to the wallet it happened to. Another wallet connected: the
    // screens update, and a wait still showing for it is cleared rather than
    // left spinning (it can get there when the wallet is switched while this
    // one's signature is still out). Another transaction owning the banner:
    // it is left alone.
    if (transaction.account !== accountRef.current) {
      if (bannerShowsIt) dismissNotification();
      return;
    }
    if (bannerShowsIt || banner.status === 'idle') {
      notifyConfirmed(pendingTransactionPayload(transaction));
    }
  }), [dismissNotification, notifyConfirmed, queryClient, refreshXLinkState]);

  // On a switch to another wallet (or none), a banner left by the previous
  // one, still waiting or just announcing it is done, is not this wallet's:
  // clear it. Then, once per visit to a wallet, show its own newest wait if
  // it has one: after a reload the banner starts empty, and after a switch it
  // is this wallet's turn. If another transaction holds the banner, the wait
  // is shown when it lets go. Not again once dismissed.
  const switchedTo = useRef<string | null | undefined>(undefined);
  const restoredFor = useRef<string | null | undefined>(undefined);
  const bannerStatus = notificationState.status;
  useEffect(() => {
    const account = activeAccount || null;
    const own = account ? findPendingTransaction({ account }) : null;
    let banner = bannerRef.current;
    if (switchedTo.current !== account) {
      // The first wallet seen is not a switch away from anything.
      const switched = switchedTo.current !== undefined;
      switchedTo.current = account;
      // Every visit to a wallet gets its own restore. Otherwise a restore put
      // off for one wallet leaves the last wallet marked as done, and
      // switching back to it would never show its wait again.
      restoredFor.current = undefined;
      if (switched && isTrackedBanner(banner) && !(own && bannerShowsTransaction(banner, own))) {
        dismissNotification();
        banner = { status: 'idle' };
      }
    }
    if (restoredFor.current === account) return;
    if (!own || bannerShowsTransaction(banner, own)) {
      restoredFor.current = account;
      return;
    }
    // Held by another transaction: wait for it to let go.
    if (banner.status !== 'idle') return;
    restoredFor.current = account;
    notifyPending(pendingTransactionPayload(own));
  }, [activeAccount, bannerStatus, dismissNotification, notifyPending]);

  return null;
};

export default PendingTransactionsSync;
