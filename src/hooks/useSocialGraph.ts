import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Contract, type ContractMethodsBase, type Encoded } from '@aeternity/aepp-sdk';
import { SocialGraphService } from '../api/generated';
import SOCIAL_CONTRACT_ACI from '../api/SocialContractACI.json';
import i18n from '../i18n';
import { useAeSdk } from './useAeSdk';
import { CONFIG } from '../config';
import { OpenAPI } from '../api/generated/core/OpenAPI';
import { getCurrentSocialGraphConfig, getSocialGraphCounts } from '../api/socialGraphPolicy';
import { useTransactionNotification, TxPayloadType } from '../features/transaction-notification';
import { subscribeSocialGraphQueries } from '../libs/socialGraphUpdates';
import { classifySocialGraphError, type SocialGraphAction } from '../utils/socialGraph';

export const socialGraphScope = () => [CONFIG.NETWORK, OpenAPI.BASE];
const configKey = () => ['SocialGraphService.getConfig', ...socialGraphScope()];
export const relationshipKey = (from?: string, to?: string, contract?: string) => [
  'SocialGraphService.relationship', ...socialGraphScope(), contract, from, to,
];
export const graphCountsKey = (address?: string, contract?: string) => [
  'SocialGraphCounts', ...socialGraphScope(), contract, address,
];

type SocialContractMethods = ContractMethodsBase & {
  follow: (target: Encoded.AccountAddress) => void;
  unfollow: (target: Encoded.AccountAddress) => void;
  block: (target: Encoded.AccountAddress) => void;
  unblock: (target: Encoded.AccountAddress) => void;
};

/**
 * Contract caps (max_following, max_blocked, follow_cooldown) and the indexed
 * contract identity. Policy refreshes on socket updates and again before signing.
 */
export function useSocialGraphConfig() {
  const client = useQueryClient();
  useEffect(() => subscribeSocialGraphQueries(client, CONFIG.NETWORK, OpenAPI.BASE), [client]);
  return useQuery({
    queryKey: configKey(),
    queryFn: getCurrentSocialGraphConfig,
    staleTime: 15_000,
    retry: 1,
  });
}

export function useSocialGraphCounts(address?: string) {
  const client = useQueryClient();
  const configQuery = useSocialGraphConfig();
  const config = configQuery.data;
  const key = graphCountsKey(address, config?.contract_address);
  const countsQuery = useQuery({
    queryKey: key,
    enabled: !!address?.startsWith('ak_') && !!config?.contract_address,
    queryFn: () => getSocialGraphCounts(address!, config!.network_id, config!.contract_address),
    staleTime: 10_000,
    retry: 1,
  });
  let countsStatus: 'loading' | 'ready' | 'error' = 'ready';
  if ((configQuery.isError && !configQuery.isFetching)
    || (countsQuery.isError && !countsQuery.isFetching)) {
    countsStatus = 'error';
  } else if (configQuery.isPending || countsQuery.isPending || countsQuery.isFetching) {
    countsStatus = 'loading';
  }
  const retryCounts = () => Promise.all([
    client.invalidateQueries({ queryKey: configKey() }),
    client.invalidateQueries({ queryKey: key }),
  ]);
  return { ...countsQuery, countsStatus, retryCounts };
}

/**
 * Pair-wise relationship, served uncached by the API. This — not the 10-minute
 * cached account route — is what drives the button state.
 */
export function useRelationship(from?: string, to?: string, contract?: string) {
  const enabled = !!from && !!to && !!contract && from !== to;
  return useQuery({
    queryKey: relationshipKey(from, to, contract),
    queryFn: () => SocialGraphService.getSocialGraphRelationship({ from: from!, to: to! }),
    enabled,
    staleTime: 15_000,
  });
}

export type SocialGraphSurfaceError = { message: string; offerUnblock?: boolean };

/**
 * Follow / unfollow / block / unblock for `targetAddress` from the connected
 * account. Every mutation is an on-chain write signed by the selected wallet.
 * It prechecks first to avoid known failures. Counts come from the committed
 * projection and refresh on websocket updates, without speculative increments.
 */
export function useSocialGraph(targetAddress?: string) {
  const { activeAccount, sdk } = useAeSdk();
  const {
    notifySubmitted, notifyConfirmed, notifyError, dismissNotification,
  } = useTransactionNotification();
  const queryClient = useQueryClient();

  const viewer = (activeAccount as string | undefined) || undefined;

  const configQuery = useSocialGraphConfig();
  const config = configQuery.data;
  const relationshipQuery = useRelationship(viewer, targetAddress, config?.contract_address);
  const relationship = relationshipQuery.data;

  const [pendingAction, setPendingAction] = useState<SocialGraphAction | null>(null);
  const [error, setError] = useState<SocialGraphSurfaceError | null>(null);

  const isSelf = !!viewer && viewer === targetAddress;
  const isFollowing = !!relationship?.a_follows_b;
  const hasBlocked = !!relationship?.a_blocked_b;

  const applyOptimistic = useCallback(
    (action: SocialGraphAction) => {
      if (!viewer || !targetAddress) return;

      queryClient.setQueryData(relationshipKey(viewer, targetAddress, config?.contract_address), (prev: any) => {
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
    },
    [queryClient, targetAddress, viewer, config?.contract_address],
  );

  const handleError = useCallback(
    (err: unknown) => {
      const info = classifySocialGraphError(err, config);
      if (info.kind === 'cancelled') return;
      if (info.kind === 'silent') {
        // Stale-state race — re-read the relationship and repaint, no toast.
        queryClient.invalidateQueries({ queryKey: relationshipKey(viewer, targetAddress, config?.contract_address) });
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
      try {
        const fresh = await getCurrentSocialGraphConfig();
        queryClient.setQueryData(configKey(), fresh);
        if (fresh.contract_address !== config.contract_address || fresh.network_id !== config.network_id) {
          throw new Error('CONTRACT_CHANGED');
        }
        if (fresh.network_id !== CONFIG.NETWORK || (await sdk.getNodeInfo()).nodeNetworkId !== fresh.network_id) {
          throw new Error('WRONG_NETWORK');
        }
        if (fresh.frozen) throw new Error('FROZEN');
        if (fresh.importing) throw new Error('IMPORTING');

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
          ...sdk.getContext(),
          aci: SOCIAL_CONTRACT_ACI as any,
          address: config.contract_address as Encoded.ContractAddress,
        });
        const payload = { type: TxPayloadType.SocialGraph, action, targetAddress };
        notifySubmitted(payload);
        await contract[action](targetAddress as Encoded.AccountAddress);
        notifyConfirmed(payload);

        await queryClient.cancelQueries({ queryKey: relationshipKey(viewer, targetAddress, config?.contract_address) });
        applyOptimistic(action);
        queryClient.invalidateQueries({ queryKey: graphCountsKey(targetAddress, config.contract_address) });
        queryClient.invalidateQueries({ queryKey: graphCountsKey(viewer, config.contract_address) });
        queryClient.invalidateQueries({ queryKey: ['SocialGraphConnections'] });
        // The committed projection push (or reconnect/focus) refreshes this state.
        queryClient.invalidateQueries({
          queryKey: relationshipKey(viewer, targetAddress, config?.contract_address),
          refetchType: 'none',
        });
      } catch (txError) {
        handleError(txError);
        const info = classifySocialGraphError(txError, config);
        if (info.kind === 'silent' || info.kind === 'cancelled') dismissNotification();
        else notifyError(i18n.t(`common.${info.messageKey}`, info.values ?? {}) as string);
      } finally {
        setPendingAction(null);
      }
    },
    [
      sdk, applyOptimistic, config, handleError, isSelf,
      queryClient, targetAddress, viewer,
      notifySubmitted, notifyConfirmed, notifyError, dismissNotification,
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
    isReady: !!config?.contract_address && !!viewer && !!targetAddress && !isSelf && !relationshipQuery.isError,
    pendingAction,
    error,
    clearError: () => setError(null),
    follow: () => runAction('follow'),
    unfollow: () => runAction('unfollow'),
    block: () => runAction('block'),
    unblock: () => runAction('unblock'),
  };
}
