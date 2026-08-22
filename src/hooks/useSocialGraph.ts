import { useCallback, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Contract, type ContractMethodsBase, type Encoded } from '@aeternity/aepp-sdk';
import { SocialGraphService } from '../api/generated';
import SOCIAL_CONTRACT_ACI from '../api/SocialContractACI.json';
import i18n from '../i18n';
import { useAeSdk } from './useAeSdk';
import { useWalletConnect } from './useWalletConnect';
import { classifySocialGraphError, type SocialGraphAction } from '../utils/socialGraph';

const CONFIG_KEY = ['SocialGraphService.getConfig'];
const relationshipKey = (from?: string, to?: string) => [
  'SocialGraphService.relationship', from, to,
];
const accountKey = (address?: string) => ['AccountsService.getAccount', address];

type SocialContractMethods = ContractMethodsBase & {
  follow: (target: Encoded.AccountAddress) => void;
  unfollow: (target: Encoded.AccountAddress) => void;
  block: (target: Encoded.AccountAddress) => void;
  unblock: (target: Encoded.AccountAddress) => void;
};

/**
 * Contract caps (max_following, max_blocked, follow_cooldown) and the indexed
 * contract address. Fixed for a deployed contract, so cache it hard.
 */
export function useSocialGraphConfig() {
  return useQuery({
    queryKey: CONFIG_KEY,
    queryFn: () => SocialGraphService.getSocialGraphConfig(),
    staleTime: 60 * 60 * 1000,
    gcTime: Infinity,
    retry: 1,
  });
}

/**
 * Pair-wise relationship, served uncached by the API. This — not the 10-minute
 * cached account route — is what drives the button state.
 */
export function useRelationship(from?: string, to?: string) {
  const enabled = !!from && !!to && from !== to;
  return useQuery({
    queryKey: relationshipKey(from, to),
    queryFn: () => SocialGraphService.getSocialGraphRelationship({ from: from!, to: to! }),
    enabled,
    staleTime: 15_000,
  });
}

export type SocialGraphSurfaceError = { message: string; offerUnblock?: boolean };

/**
 * Follow / unfollow / block / unblock for `targetAddress` from the connected
 * account. Every mutation is an on-chain write signed by the user's wallet — the
 * client never touches key material — so it prechecks first (never sign a
 * transaction the chain will abort) and moves the displayed counts optimistically
 * on confirmation, letting the cached chain-truth reconverge.
 */
export function useSocialGraph(targetAddress?: string) {
  const { activeAccount, aeSdk } = useAeSdk();
  const { connectWallet, walletConnected } = useWalletConnect();
  const queryClient = useQueryClient();

  const viewer = (activeAccount as string | undefined) || undefined;

  const configQuery = useSocialGraphConfig();
  const relationshipQuery = useRelationship(viewer, targetAddress);
  const config = configQuery.data;
  const relationship = relationshipQuery.data;

  const [pendingAction, setPendingAction] = useState<SocialGraphAction | null>(null);
  const [error, setError] = useState<SocialGraphSurfaceError | null>(null);

  const isSelf = !!viewer && viewer === targetAddress;
  const isFollowing = !!relationship?.a_follows_b;
  const hasBlocked = !!relationship?.a_blocked_b;

  const bumpCount = useCallback(
    (address: string | undefined, field: 'followers_count' | 'following_count', delta: number) => {
      if (!address) return;
      queryClient.setQueryData(accountKey(address), (prev: any) => {
        const current = prev?.profile?.[field];
        if (typeof current !== 'number') return prev;
        return { ...prev, profile: { ...prev.profile, [field]: Math.max(0, current + delta) } };
      });
    },
    [queryClient],
  );

  const applyOptimistic = useCallback(
    (action: SocialGraphAction, before?: { a_follows_b: boolean; b_follows_a: boolean }) => {
      if (!viewer || !targetAddress) return;

      queryClient.setQueryData(relationshipKey(viewer, targetAddress), (prev: any) => {
        const base = prev ?? {
          a_follows_b: false, b_follows_a: false, a_blocked_b: false, b_blocked_a: false,
        };
        switch (action) {
          case 'follow': return { ...base, a_follows_b: true };
          case 'unfollow': return { ...base, a_follows_b: false };
          // Blocking severs follows in both directions (contract cascade).
          case 'block': return {
            ...base, a_blocked_b: true, a_follows_b: false, b_follows_a: false,
          };
          case 'unblock': return { ...base, a_blocked_b: false };
          default: return base;
        }
      });

      if (action === 'follow') {
        bumpCount(targetAddress, 'followers_count', 1);
        bumpCount(viewer, 'following_count', 1);
      } else if (action === 'unfollow') {
        bumpCount(targetAddress, 'followers_count', -1);
        bumpCount(viewer, 'following_count', -1);
      } else if (action === 'block') {
        if (before?.a_follows_b) {
          bumpCount(targetAddress, 'followers_count', -1);
          bumpCount(viewer, 'following_count', -1);
        }
        if (before?.b_follows_a) {
          bumpCount(viewer, 'followers_count', -1);
          bumpCount(targetAddress, 'following_count', -1);
        }
      }
    },
    [bumpCount, queryClient, targetAddress, viewer],
  );

  const handleError = useCallback(
    (err: unknown) => {
      const info = classifySocialGraphError(err, config);
      if (info.kind === 'silent') {
        // Stale-state race — re-read the relationship and repaint, no toast.
        queryClient.invalidateQueries({ queryKey: relationshipKey(viewer, targetAddress) });
        return;
      }
      setError({
        message: i18n.t(`common.${info.messageKey}`, info.values ?? {}) as string,
        offerUnblock: info.offerUnblock,
      });
    },
    [config, queryClient, targetAddress, viewer],
  );

  const runAction = useCallback(
    async (action: SocialGraphAction) => {
      if (!viewer || !targetAddress || isSelf || !config?.contract_address) return;
      setError(null);
      setPendingAction(action);
      const before = relationship
        ? { a_follows_b: relationship.a_follows_b, b_follows_a: relationship.b_follows_a }
        : undefined;
      try {
        // Sign with the connected wallet, never a locally held key.
        if (!walletConnected) await connectWallet();

        // Advisory precheck: do not ask the user to sign a doomed transaction.
        try {
          await SocialGraphService.precheckSocialGraphAction({
            requestBody: { action: action as any, from: viewer, to: targetAddress },
          });
        } catch (precheckError) {
          handleError(precheckError);
          return;
        }

        const contract = await Contract.initialize<SocialContractMethods>({
          ...aeSdk.getContext(),
          aci: SOCIAL_CONTRACT_ACI as any,
          address: config.contract_address as Encoded.ContractAddress,
        });
        await contract[action](targetAddress as Encoded.AccountAddress);

        applyOptimistic(action, before);
        await queryClient.invalidateQueries({ queryKey: relationshipKey(viewer, targetAddress) });
      } catch (txError) {
        handleError(txError);
      } finally {
        setPendingAction(null);
      }
    },
    [
      aeSdk, applyOptimistic, config, connectWallet, handleError, isSelf,
      queryClient, relationship, targetAddress, viewer, walletConnected,
    ],
  );

  return {
    config,
    configLoading: configQuery.isLoading,
    relationship,
    relationshipLoading: relationshipQuery.isLoading,
    viewer,
    isSelf,
    isFollowing,
    hasBlocked,
    blockedByThem: !!relationship?.b_blocked_a,
    isReady: !!config?.contract_address && !!viewer && !!targetAddress && !isSelf,
    pendingAction,
    error,
    clearError: () => setError(null),
    follow: () => runAction('follow'),
    unfollow: () => runAction('unfollow'),
    block: () => runAction('block'),
    unblock: () => runAction('unblock'),
  };
}
