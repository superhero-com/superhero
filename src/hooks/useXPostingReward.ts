import {
  useState, useEffect, useCallback, useRef,
} from 'react';
import {
  SuperheroApi,
  type XPostingRewardStatus,
  type XReferralLinkResponse,
} from '@/api/backend';
import { signAndVerifyLinkMessage } from '@/utils/signLinkMessage';
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
    connectWallet,
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
    connectWallet,
    restoreAccount: addStaticAccount,
  });
  const [status, setStatus] = useState<XPostingRewardStatus | null>(null);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [checkLoading, setCheckLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Surface a reward failure as the persistent banner (error state) so the user
  // sees why the reward was not sent, shown as the red wording in the header.
  const surfaceError = useCallback((message: string) => {
    setError(cleanErrorMessage(message));
  }, []);

  // Track whether status has been loaded at least once for this address.
  const loadedForRef = useRef<string | undefined>(undefined);

  const loadStatus = useCallback(async () => {
    if (!activeAccount) return;
    setStatusLoading(true);
    try {
      const s = await SuperheroApi.getXPostingRewardStatus(activeAccount);
      setStatus(s);
      if (s.referral_link) setReferralLink(s.referral_link);
      loadedForRef.current = activeAccount;
    } catch {
      // fail silently — status unavailable (API may not be deployed yet)
    } finally {
      setStatusLoading(false);
    }
  }, [activeAccount]);

  useEffect(() => {
    if (activeAccount && loadedForRef.current !== activeAccount) {
      loadStatus();
    }
  }, [activeAccount, loadStatus]);

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
      setError('Connect your wallet first');
      return null;
    }
    setError(null);
    setLinkLoading(true);
    try {
      const proof = await buildSignedProof(activeAccount);
      const result = await SuperheroApi.getXReferralLink(activeAccount, proof);
      setReferralLink(result.link);
      return result;
    } catch (err) {
      if (!isUserRejection(err)) {
        surfaceError(err instanceof Error ? err.message : 'Failed to get referral link');
      }
      return null;
    } finally {
      setLinkLoading(false);
    }
  }, [activeAccount, buildSignedProof, surfaceError]);

  const runRewardCheck = useCallback(async (): Promise<XPostingRewardStatus | null> => {
    if (!activeAccount) {
      setError('Connect your wallet first');
      return null;
    }
    setError(null);
    setCheckLoading(true);
    try {
      const proof = await buildSignedProof(activeAccount);
      const updated = await SuperheroApi.runXPostingRewardRecheck(activeAccount, proof);
      setStatus(updated);
      if (updated.referral_link) setReferralLink(updated.referral_link);
      // A successful (HTTP 200) recheck still reports via `error` why no reward
      // was sent (below follower minimum, identity already rewarded, payout
      // failed, etc.). Surface it instead of silently showing "no change".
      if (updated.error) surfaceError(updated.error);
      return updated;
    } catch (err) {
      if (!isUserRejection(err)) {
        surfaceError(err instanceof Error ? err.message : 'Reward check failed');
      }
      return null;
    } finally {
      setCheckLoading(false);
    }
  }, [activeAccount, buildSignedProof, surfaceError]);

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
