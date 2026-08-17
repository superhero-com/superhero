import {
  useCallback, useEffect, useMemo, useState,
} from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useLocation, useNavigate } from 'react-router-dom';
import { MemoryAccount, toAe } from '@aeternity/aepp-sdk';
import type { Encoded } from '@aeternity/aepp-sdk';
import moment from 'moment';
import camelCaseKeysDeep from 'camelcase-keys-deep';

import { Decimal } from '../../../libs/decimal';
import { useAccount } from '../../../hooks/useAccount';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { getAffiliationTreasury } from '../../../libs/affiliation';
import { normalizeSecretKey } from '../../../utils/secretKey';
import { fetchJson } from '../../../utils/common';
import { InvitationsService } from '../../../api/generated/services/InvitationsService';
import {
  invitationListAtom,
  invitationCodeAtom,
  claimedInvitationsAtom,
  recentlyRevokedInvitationsAtom,
  invitationLoadingAtom,
  invitationRefreshTriggerAtom,
  refreshInvitationsAtom,
  type InvitationInfo,
  type InvitationStatus,
  type ClaimedInfo,
} from '../../../atoms/invitationAtoms';
import {
  TX_FUNCTIONS,
  DATE_LONG,
  INVITATIONS_CONTRACT,
} from '../../../utils/constants';
import { ITransaction } from '../../../utils/types';

const INVITE_CODE_QUERY_KEY = 'invite_code';
const ACCOUNT_ADDRESS_PREFIX = 'ak_';

function collectAccountAddresses(value: unknown): Encoded.AccountAddress[] {
  if (typeof value === 'string') {
    return value.startsWith(ACCOUNT_ADDRESS_PREFIX)
      ? [value as Encoded.AccountAddress]
      : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectAccountAddresses);
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return collectAccountAddresses((value as { value: unknown }).value);
  }

  return [];
}

export function getArgumentAccountAddresses(argument: unknown): Encoded.AccountAddress[] {
  return collectAccountAddresses(argument);
}

export function useInvitations() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeAccount } = useAccount();
  const { sdk, activeNetwork } = useAeSdk();

  // Atoms
  const [invitationList, setInvitationList] = useAtom(invitationListAtom);
  const [invitationCode, setInvitationCode] = useAtom(invitationCodeAtom);
  const [claimedInvitations, setClaimedInvitations] = useAtom(claimedInvitationsAtom);
  const [
    recentlyRevokedInvitations,
    setRecentlyRevokedInvitations,
  ] = useAtom(recentlyRevokedInvitationsAtom);
  const [loading, setLoading] = useAtom(invitationLoadingAtom);
  const refreshTrigger = useAtomValue(invitationRefreshTriggerAtom);
  const triggerRefresh = useSetAtom(refreshInvitationsAtom);

  // Computed - active account's invitations
  const activeAccountInviteList = useMemo(() => {
    if (!activeAccount) return [];
    return invitationList.filter(({ inviter }) => inviter === activeAccount);
  }, [invitationList, activeAccount]);

  // Transaction list state for invitation statuses
  const [transactionList, setTransactionList] = useState<ITransaction[]>([]);

  // Helper functions
  const prepareInviteLink = useCallback(
    (secretKey: string): string => `${window.location.protocol}//${window.location.host}#${INVITE_CODE_QUERY_KEY}=${normalizeSecretKey(secretKey)}`,
    [],
  );

  const getInvitationRevokeStatus = useCallback((invitee: string): ITransaction | boolean => {
    const revokeTx = transactionList.find((tx) => {
      if (tx?.tx?.function !== TX_FUNCTIONS.revoke_invitation_code) return false;

      return getArgumentAccountAddresses(tx?.tx?.arguments?.[0]?.value).includes(
        invitee as Encoded.AccountAddress,
      );
    }) ?? false;

    return revokeTx || recentlyRevokedInvitations.includes(invitee);
  }, [transactionList, recentlyRevokedInvitations]);

  const determineInvitationStatus = useCallback((
    claimed: boolean,
    hasRevokeTx: any,
  ): 'created' | 'claimed' | 'revoked' => {
    if (claimed) return 'claimed';
    if (hasRevokeTx) return 'revoked';
    return 'created';
  }, []);

  const getInvitationSecretKey = useCallback(
    (
      invitee: string,
    ): string | undefined => activeAccountInviteList
      .find((item) => item.invitee === invitee)?.secretKey,
    [activeAccountInviteList],
  );

  const getInvitationStatusDetails = useCallback((
    invitee: Encoded.AccountAddress,
  ) => {
    const revokeStatus = getInvitationRevokeStatus(invitee);
    const claimedData = claimedInvitations[invitee];
    const claimed = !!claimedData;
    const claimedInfo = typeof claimedData === 'object' ? claimedData as ClaimedInfo : null;

    return {
      status: determineInvitationStatus(claimed, revokeStatus),
      invitee,
      revoked: !!revokeStatus,
      ...(typeof revokeStatus === 'object' && {
        revokedAt: moment(revokeStatus.microTime).format(DATE_LONG),
        revokeTxHash: revokeStatus.hash,
      }),
      claimed,
      ...(claimedInfo && {
        claimedBy: claimedInfo.claimedBy,
        claimedAt: claimedInfo.claimedAt
          ? moment(claimedInfo.claimedAt).format(DATE_LONG)
          : undefined,
        claimTxHash: claimedInfo.claimTxHash,
      }),
    };
  }, [
    getInvitationRevokeStatus,
    claimedInvitations,
    determineInvitationStatus,
  ]);

  const getInvitationStatus = useCallback((
    invitee: Encoded.AccountAddress,
    transaction: ITransaction,
  ): InvitationStatus => {
    const secretKey = getInvitationSecretKey(invitee);

    return {
      ...getInvitationStatusDetails(invitee),
      hash: transaction.hash,
      date: moment(transaction.microTime).format(DATE_LONG),
      amount: Decimal.from(toAe(transaction.tx.arguments[2].value)).prettify(),
      secretKey,
    };
  }, [
    getInvitationStatusDetails,
    getInvitationSecretKey,
  ]);

  const getStoredInvitationStatus = useCallback((
    invitation: InvitationInfo,
  ): InvitationStatus => {
    const invitee = invitation.invitee as Encoded.AccountAddress;

    return {
      ...getInvitationStatusDetails(invitee),
      hash: `local-${invitee}`,
      date: moment(invitation.date).format(DATE_LONG),
      amount: Decimal.from(invitation.amount).prettify(),
      secretKey: invitation.secretKey,
    };
  }, [
    getInvitationStatusDetails,
  ]);

  // Computed invitations with status
  const invitations = useMemo(() => {
    const transactionInvitations = transactionList
      .filter((transaction) => transaction?.tx?.function === TX_FUNCTIONS.register_invitation_code)
      .flatMap((transaction) => getArgumentAccountAddresses(transaction.tx.arguments?.[0]?.value)
        .map((invitee) => getInvitationStatus(invitee, transaction)));

    const transactionInvitees = new Set(
      transactionInvitations.map(({ invitee }) => invitee),
    );

    const storedInvitations = activeAccountInviteList
      .filter(({ invitee }) => !transactionInvitees.has(invitee))
      .map(getStoredInvitationStatus);

    return [...transactionInvitations, ...storedInvitations];
  }, [
    transactionList,
    activeAccountInviteList,
    getInvitationStatus,
    getStoredInvitationStatus,
  ]);

  // Load transactions from middleware
  const loadTransactionsFromMiddleware = useCallback(async (
    url: string,
    _transactionList: ITransaction[] = [],
  ): Promise<ITransaction[]> => {
    const response = await fetchJson(url);
    const transactions: ITransaction[] = response.data
      ? (camelCaseKeysDeep(response.data) as unknown as ITransaction[])
      : [];
    _transactionList.push(...transactions);

    if (response.next) {
      return loadTransactionsFromMiddleware(
        `${activeNetwork.middlewareUrl}${response.next}`,
        _transactionList,
      );
    }
    return _transactionList;
  }, [activeNetwork]);

  const loadAccountInvitations = useCallback(async (
    address: string,
  ): Promise<ITransaction[]> => {
    const url = `${activeNetwork.middlewareUrl}/v3/transactions?contract=${INVITATIONS_CONTRACT}&caller_id=${address}`;
    return loadTransactionsFromMiddleware(url);
  }, [activeNetwork, loadTransactionsFromMiddleware]);

  // Manual refresh function for external use
  const refreshInvitationData = useCallback(async () => {
    if (!activeAccount) return;

    setLoading(true);
    try {
      const data = await loadAccountInvitations(activeAccount);
      setTransactionList(data);
    } catch (error) {
      console.error('Failed to load invitation data:', error);
      setTransactionList([]);
    } finally {
      setLoading(false);
    }
  }, [activeAccount, loadAccountInvitations, setLoading]);

  // Generate invite keys function
  const generateInviteKeys = useCallback(async (
    amount: number,
    invitesNumber = 1,
  ): Promise<string[]> => {
    if (!activeAccount) {
      throw new Error('No active account available');
    }

    if (!sdk) {
      throw new Error('SDK not initialized. Please connect your wallet and try again.');
    }

    const treasury = await getAffiliationTreasury(sdk as any);
    const keyPairs = new Array(+invitesNumber)
      .fill(null)
      .map(() => MemoryAccount.generate());
    const redemptionFeeCover = 10n ** 15n;
    const inviteAmount = BigInt(Decimal.from(amount).bigNumber);

    // Register invitation codes on the blockchain
    await treasury.registerInvitationCode(
      keyPairs.map(({ address }) => address),
      redemptionFeeCover,
      inviteAmount,
    );

    // Keep generated invitations in memory for the current session only.
    const now = Date.now();
    const newInvitations: InvitationInfo[] = keyPairs.map(({ secretKey, address }) => ({
      inviter: activeAccount as Encoded.AccountAddress,
      invitee: address as Encoded.AccountAddress,
      secretKey,
      amount,
      date: now,
    }));

    setInvitationList((prev) => [...newInvitations, ...prev]);

    // Trigger refresh to update invitation statuses
    triggerRefresh();

    return keyPairs.map(({ secretKey }) => secretKey);
  }, [activeAccount, sdk, setInvitationList, triggerRefresh]);

  // Remove stored invite function
  const removeStoredInvite = useCallback((invitee: Encoded.AccountAddress, secretKey?: string) => {
    if (!activeAccount) return;

    setInvitationList((prev) => prev
      .filter((inv) => inv.secretKey !== secretKey || inv.invitee !== invitee));
  }, [activeAccount, setInvitationList]);

  // Revoke invitation function
  const revokeInvitation = useCallback(async (invitation: InvitationStatus) => {
    if (!sdk) throw new Error('SDK not initialized');

    try {
      const affiliationTreasury = await getAffiliationTreasury(sdk as any);
      await (affiliationTreasury as any).revokeInvitationCode(invitation.invitee);

      setRecentlyRevokedInvitations((prev) => [...prev, invitation.invitee]);
      removeStoredInvite(invitation.invitee as `ak_${string}`, invitation.secretKey);
      // Kick a refresh so on-chain revoke tx can be picked up as soon as middleware serves it.
      triggerRefresh();
    } catch (error: any) {
      console.error('Failed to revoke invitation:', error);
      if (error.message?.includes('INVITATION_NOT_REGISTERED')) {
        removeStoredInvite(invitation.invitee as `ak_${string}`, invitation.secretKey);
      } else if (error.message?.includes('ALREADY_REDEEMED')) {
        // Refresh data to get updated status
        triggerRefresh();
      }
      throw error;
    }
  }, [sdk, setRecentlyRevokedInvitations, removeStoredInvite, triggerRefresh]);

  // Reset invite code function
  const resetInviteCode = useCallback(() => {
    const currentHash = location.hash;
    if (currentHash) {
      navigate({ hash: '' });
    }
    setInvitationCode(undefined);
  }, [location, navigate, setInvitationCode]);

  // Handle URL hash changes for invitation codes
  useEffect(() => {
    const { hash } = location;
    if (hash) {
      const hashParsed = new URLSearchParams(hash.replace('#', ''));
      const inviteCode = hashParsed.get(INVITE_CODE_QUERY_KEY);
      if (inviteCode) {
        setInvitationCode(inviteCode);
        navigate('/', { replace: true });
      }
    }
  }, [location, location.hash, navigate, setInvitationCode]);

  // Refresh data when active account changes or refresh is triggered
  useEffect(() => {
    if (!activeAccount) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const data = await loadAccountInvitations(activeAccount);
        setTransactionList(data);
      } catch (error) {
        console.error('Failed to load invitation data:', error);
        setTransactionList([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeAccount, refreshTrigger, loadAccountInvitations, setLoading]);

  // Load claimed status for all of this inviter's invitations in one paginated
  // sweep instead of one middleware lookup per invitee. The backend already
  // tracks claim status on the Invitation row (receiver_address is the
  // ephemeral invitee keypair; claimer_address is the real wallet that
  // redeemed it), keyed the same way `invitee` is used throughout this hook.
  const loadClaimedStatusForInviter = useCallback(async (
    inviter: string,
  ): Promise<Record<string, ClaimedInfo | boolean>> => {
    const claimedByReceiver: Record<string, ClaimedInfo | boolean> = {};
    let page = 1;
    let totalPages = 1;

    do {
      // eslint-disable-next-line no-await-in-loop
      const response = await InvitationsService.listAll({
        inviter,
        limit: 100,
        page,
      }) as any;
      const items: any[] = Array.isArray(response?.items) ? response.items : [];

      items.forEach((item) => {
        if (!item?.claimed || !item?.receiver_address) return;
        claimedByReceiver[item.receiver_address] = item.claimer_address
          ? {
            claimedBy: item.claimer_address,
            claimedAt: item.claimed_at ? new Date(item.claimed_at).getTime() : undefined,
            claimTxHash: item.claim_tx_hash ?? undefined,
          } as ClaimedInfo
          : true;
      });

      totalPages = response?.meta?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages);

    return claimedByReceiver;
  }, []);

  useEffect(() => {
    if (!activeAccount) return;

    const loadClaimed = async () => {
      try {
        const claimedByReceiver = await loadClaimedStatusForInviter(activeAccount);
        setClaimedInvitations((prev) => ({ ...prev, ...claimedByReceiver }));
      } catch (error) {
        console.error('Failed to load claimed invitation status:', error);
      }
    };

    loadClaimed();
  }, [activeAccount, refreshTrigger, loadClaimedStatusForInviter, setClaimedInvitations]);

  return {
    // Data
    invitationCode,
    invitationList,
    activeAccountInviteList,
    invitations,
    claimedInvitations,
    recentlyRevokedInvitations,
    loading,

    // Actions
    generateInviteKeys,
    resetInviteCode,
    removeStoredInvite,
    revokeInvitation,
    refreshInvitationData,
    triggerRefresh,
    prepareInviteLink,
  };
}
