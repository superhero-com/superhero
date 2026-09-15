import { useState, useCallback } from 'react';
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
  const [referralLinkOverride, setReferralLinkOverride] = useState<string | null>(null);
  const [checkLoading, setCheckLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Surface a reward failure as the persistent banner (error state) so the user
  // sees why the reward was not sent, shown as the red wording in the header.
  const surfaceError = useCallback((message: string) => {
    setError(cleanErrorMessage(message));
  }, []);

  const {
    data: statusData,
    isPending: statusPending,
    isError: statusUnavailable,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: [X_POSTING_REWARD_QUERY_KEY, activeAccount],
    queryFn: () => SuperheroApi.getXPostingRewardStatus(activeAccount as string),
    enabled: Boolean(activeAccount),
    staleTime: 10_000,
  });
  const status = statusData ?? null;
  // `isPending` is true for a disabled query too, so a signed-out visitor would
  // otherwise look like a perpetual load.
  const statusLoading = Boolean(activeAccount) && statusPending;

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

  // The freshly minted link wins until the next status read carries it.
  const referralLink = referralLinkOverride ?? status?.referral_link ?? null;

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
      setError(i18n.t('common.messages.connectWalletFirst'));
      return null;
    }
    setError(null);
    setLinkLoading(true);
    try {
      const proof = await buildSignedProof(activeAccount);
      const result = await SuperheroApi.getXReferralLink(activeAccount, proof);
      setReferralLinkOverride(result.link);
      return result;
    } catch (err) {
      if (!isUserRejection(err)) {
        surfaceError(err instanceof Error ? err.message : i18n.t('common.messages.referralLinkFailed'));
      }
      return null;
    } finally {
      setLinkLoading(false);
    }
  }, [activeAccount, buildSignedProof, surfaceError]);

  const runRewardCheck = useCallback(async (): Promise<XPostingRewardStatus | null> => {
    if (!activeAccount) {
      setError(i18n.t('common.messages.connectWalletFirst'));
      return null;
    }
    setError(null);
    setCheckLoading(true);
    try {
      const proof = await buildSignedProof(activeAccount);
      const updated = await SuperheroApi.runXPostingRewardRecheck(activeAccount, proof);
      writeStatus(updated);
      if (updated.referral_link) setReferralLinkOverride(updated.referral_link);
      // A successful (HTTP 200) recheck still reports via `error` why no reward
      // was sent (below follower minimum, identity already rewarded, payout
      // failed, etc.). Surface it instead of silently showing "no change".
      if (updated.error) surfaceError(updated.error);
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
    checkLoading,
    linkLoading,
    error,
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
