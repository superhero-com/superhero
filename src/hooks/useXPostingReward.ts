import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  SuperheroApi,
  type XPostingRewardStatus,
  type XReferralLinkResponse,
} from '@/api/backend';
import { signAndVerifyLinkMessage } from '@/utils/signLinkMessage';
import i18n from '@/i18n';
import { useAeSdk } from './useAeSdk';
import { useWalletConnect } from './useWalletConnect';
import { useWalletReconnect } from './useWalletReconnect';

const isUserRejection = (err: unknown) => {
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  const code = (err as Record<string, unknown>)?.code;
  return (
    code === 'ACTION_REJECTED'
    || code === 4001
    || /rejected|denied|cancelled|canceled/i.test(msg)
  );
};

// The API client wraps backend messages as "Superhero API error (NNN): <reason>".
// Strip that prefix so the user sees just the human-readable reason.
const cleanErrorMessage = (raw: string): string => raw.replace(/^Superhero API error \(\d+\):\s*/, '').trim() || raw;

/**
 * Shared cache key for the reward status.
 *
 * The status drives three separate surfaces (home feed card, right rail card,
 * rewards page) that can be mounted at the same time. Keying them together
 * means one request instead of three, and a recheck on the rewards page is
 * reflected by the other two immediately rather than on their next remount.
 */
export const X_POSTING_REWARD_QUERY_KEY = 'xPostingRewardStatus';

export function useXPostingReward() {
  const {
    activeAccount,
    aeSdk,
    sdk,
    staticAeSdk,
    addStaticAccount,
    signMessage,
  } = useAeSdk();
  const {
    reconnectWallet,
    connectingWallet,
    walletConnected,
    walletInfo,
  } = useWalletConnect();

  // After a reload the RPC session is gone even though the wallet address is
  // still persisted. Restoring the saved address re-adds it to the static SDK
  // (recreating the deep-link signer) so the shared signMessage channel works
  // again — same approach as useProfile.
  const waitForWalletReconnect = useWalletReconnect({
    activeAccount,
    signerSdks: [staticAeSdk, sdk, aeSdk],
    walletConnected,
    walletInfo,
    connectingWallet,
    // Silent, non-destructive variant: connectWallet would clear the restored
    // session (activeAccount, walletInfo) before scanning if the app-level
    // silent reconnect has not finished yet.
    connectWallet: reconnectWallet,
    restoreAccount: addStaticAccount,
  });
  const queryClient = useQueryClient();
  // Keyed by the address it was minted for. The status query is account-keyed,
  // but this override is plain component state: without the address it would
  // outlive an account switch on a still-mounted page and hand the next wallet
  // the previous wallet's referral URL to post with.
  const [referralLinkOverride, setReferralLinkOverride] = useState<
  { address: string; link: string } | null
  >(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  // Holds only *action* failures (fetch link, recheck, connect-first). The
  // reason a 200 status read carries is derived from the query data below, not
  // stored here — so a later refetch clears it on its own.
  const [actionError, setActionError] = useState<string | null>(null);

  // Surface an action failure as the persistent banner, shown as the red
  // wording in the header, so the user sees why the action did not complete.
  const surfaceError = useCallback((message: string) => {
    setActionError(cleanErrorMessage(message));
  }, []);

  const {
    data: statusData,
    isPending: statusPending,
    isError: statusUnavailable,
    error: statusError,
    refetch: refetchStatus,
    // Inherit the app-wide 5-minute default (main.tsx) rather than a 10s
    // staleTime: the shared cache is the point, and a 10s window refires this
    // 10-req/min-per-IP endpoint on every remount or tab-focus.
  } = useQuery({
    queryKey: [X_POSTING_REWARD_QUERY_KEY, activeAccount],
    queryFn: () => SuperheroApi.getXPostingRewardStatus(activeAccount as string),
    enabled: Boolean(activeAccount),
  });
  const status = statusData ?? null;
  // Reason to show when the status read itself failed (network / 5xx), as
  // opposed to a 200 that carries `error`. Cleaned of the client's wrapper.
  const statusErrorMessage = statusUnavailable
    ? cleanErrorMessage(statusError instanceof Error ? statusError.message : '')
    : null;
  // `isPending` is true for a disabled query too, so a signed-out visitor would
  // otherwise look like a perpetual load.
  const statusLoading = Boolean(activeAccount) && statusPending;

  // A 200 status read still reports via `error` why no reward was sent (program
  // disabled, below the follower minimum, identity already rewarded, payout
  // failed, ...). Derive it straight from the query data instead of mirroring it
  // into local state: a later background refetch returning `error: null` then
  // clears the banner on its own, and a stale reason cannot outlive the read.
  const statusReason = statusData?.error ? cleanErrorMessage(statusData.error) : null;

  // The action banner is component state, so on an account switch wallet A's
  // action failure would otherwise stay pinned against wallet B. Reset it
  // whenever the active account changes; the status reason above is account-
  // keyed via the query and resets itself.
  useEffect(() => {
    setActionError(null);
  }, [activeAccount]);

  /** Publish a fresh status to every surface reading this address. */
  const writeStatus = useCallback((updated: XPostingRewardStatus) => {
    queryClient.setQueryData(
      [X_POSTING_REWARD_QUERY_KEY, activeAccount],
      updated,
    );
  }, [queryClient, activeAccount]);

  const loadStatus = useCallback(async () => {
    if (!activeAccount) return;
    await refetchStatus();
  }, [activeAccount, refetchStatus]);

  // The freshly minted link wins until the next status read carries it, but
  // only for the account it was minted for.
  const referralLink = (
    referralLinkOverride && referralLinkOverride.address === activeAccount
      ? referralLinkOverride.link
      : null
  ) ?? status?.referral_link ?? null;

  const buildSignedProof = useCallback(async (address: string) => {
    // Recreate the signer from the saved address (e.g. after a page reload)
    // before asking the wallet to sign.
    const signerAddress = await waitForWalletReconnect(address);
    const target = signerAddress || address;
    const challenge = await SuperheroApi.createXRecheckChallenge(target);
    const signatureHex = await signAndVerifyLinkMessage(target, signMessage, challenge.message);
    return {
      challenge_nonce: challenge.nonce,
      challenge_expires_at: String(challenge.expires_at),
      signature_hex: signatureHex,
    };
  }, [signMessage, waitForWalletReconnect]);

  const fetchReferralLink = useCallback(async (): Promise<XReferralLinkResponse | null> => {
    if (!activeAccount) {
      setActionError(i18n.t('common.messages.connectWalletFirst'));
      return null;
    }
    setActionError(null);
    setLinkLoading(true);
    try {
      const proof = await buildSignedProof(activeAccount);
      const result = await SuperheroApi.getXReferralLink(activeAccount, proof);
      setReferralLinkOverride({ address: activeAccount, link: result.link });
      // Publish into the shared status cache too, so the other two surfaces get
      // the freshly minted link and it survives navigation — not just this
      // component's local override.
      queryClient.setQueryData(
        [X_POSTING_REWARD_QUERY_KEY, activeAccount],
        (prev: XPostingRewardStatus | undefined) => (
          prev ? { ...prev, referral_link: result.link } : prev
        ),
      );
      return result;
    } catch (err) {
      if (!isUserRejection(err)) {
        surfaceError(err instanceof Error ? err.message : i18n.t('common.messages.referralLinkFailed'));
      }
      return null;
    } finally {
      setLinkLoading(false);
    }
  }, [activeAccount, buildSignedProof, surfaceError, queryClient]);

  const runRewardCheck = useCallback(async (): Promise<XPostingRewardStatus | null> => {
    if (!activeAccount) {
      setActionError(i18n.t('common.messages.connectWalletFirst'));
      return null;
    }
    setActionError(null);
    setCheckLoading(true);
    try {
      const proof = await buildSignedProof(activeAccount);
      const updated = await SuperheroApi.runXPostingRewardRecheck(activeAccount, proof);
      // A successful (HTTP 200) recheck still reports via `error` why no reward
      // was sent (below follower minimum, identity already rewarded, payout
      // failed, etc.). Publishing it to the status cache surfaces the reason via
      // `statusReason` — no separate mirror to keep in sync or clear.
      writeStatus(updated);
      if (updated.referral_link) {
        setReferralLinkOverride({
          address: activeAccount,
          link: updated.referral_link,
        });
      }
      return updated;
    } catch (err) {
      if (!isUserRejection(err)) {
        surfaceError(err instanceof Error ? err.message : i18n.t('common.messages.rewardCheckFailed'));
      }
      return null;
    } finally {
      setCheckLoading(false);
    }
  }, [activeAccount, buildSignedProof, surfaceError, writeStatus]);

  const nextCheckAt = status?.next_check_allowed_at
    ? new Date(status.next_check_allowed_at)
    : null;
  const canCheck = !nextCheckAt || nextCheckAt.getTime() <= Date.now();

  // Derived onboarding state, shared by the rewards page and the inline
  // onboarding nudges (home feed + right rail).
  const isXLinked = Boolean(status?.x_username)
    || (status != null && status.status !== 'not_started');
  const isOnboardingPaid = status?.status === 'paid';
  // Milestone 1 is complete once the onboarding reward has been paid.
  const onboardingComplete = isOnboardingPaid;

  return {
    status,
    referralLink,
    statusLoading,
    // The status read failed. Surfaces should stay quiet rather than render a
    // null status as "no steps done", which is what a paid user used to see.
    statusUnavailable,
    statusErrorMessage,
    checkLoading,
    linkLoading,
    // An in-flight action's own failure takes precedence over the standing
    // status reason; when there is none, fall back to the derived reason.
    error: actionError ?? statusReason,
    canCheck,
    nextCheckAt,
    isXLinked,
    isOnboardingPaid,
    onboardingComplete,
    fetchReferralLink,
    runRewardCheck,
    refresh: loadStatus,
  };
}
