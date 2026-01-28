import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useLocation, useNavigate } from 'react-router-dom';
import { generateKeyPair, toAe } from '@aeternity/aepp-sdk';
import type { Encoded } from '@aeternity/aepp-sdk';
import moment from 'moment';
import camelCaseKeysDeep from 'camelcase-keys-deep';

import { Decimal } from '../../../libs/decimal';
import { useAccount } from '../../../hooks/useAccount';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { getAffiliationTreasury } from '../../../libs/affiliation';
import { fetchJson } from '../../../utils/common';
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

export function useInvitations() {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeAccount } = useAccount();
  const { sdk, activeNetwork } = useAeSdk();

  // Atoms
  const [invitationList, setInvitationList] = useAtom(invitationListAtom);
  const [invitationCode, setInvitationCode] = useAtom(invitationCodeAtom);
  const [claimedInvitations, setClaimedInvitations] = useAtom(claimedInvitationsAtom);
  const [recentlyRevokedInvitations, setRecentlyRevokedInvitations] = useAtom(recentlyRevokedInvitationsAtom);
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
  const prepareInviteLink = useCallback((secretKey: string): string => {
    return `${window.location.protocol}//${window.location.host}#${INVITE_CODE_QUERY_KEY}=${secretKey}`;
  }, []);

  const getInvitationRevokeStatus = useCallback((invitee: string): ITransaction | boolean => {
    const revokeTx =
      transactionList.find((tx) => {
        if (tx?.tx?.function !== TX_FUNCTIONS.revoke_invitation_code) return false;

        const arg0 = tx?.tx?.arguments?.[0]?.value;

        // Middleware can return either:
        // - { type: "address", value: "ak_..." }
        // - { type: "list", value: [{ type: "address", value: "ak_..." }, ...] }
        if (typeof arg0 === 'string') return arg0 === invitee;

        if (Array.isArray(arg0)) {
          return arg0.some((item: any) => item?.value === invitee || item === invitee);
        }

        return false;
      }) ?? false;

    return revokeTx || recentlyRevokedInvitations.includes(invitee);
  }, [transactionList, recentlyRevokedInvitations]);

  const determineInvitationStatus = useCallback((
    claimed: boolean,
    hasRevokeTx: any
  ): "created" | "claimed" | "revoked" => {
    if (claimed) return "claimed";
    if (hasRevokeTx) return "revoked";
    return "created";
  }, []);

  const getInvitationSecretKey = useCallback((invitee: string): string | undefined => {
    return activeAccountInviteList.find((item) => item.invitee === invitee)?.secretKey;
  }, [activeAccountInviteList]);

  const getInvitationStatus = useCallback((
    invitee: Encoded.AccountAddress,
    transaction: ITransaction
  ): InvitationStatus => {
    const revokeStatus = getInvitationRevokeStatus(invitee);
    const claimedData = claimedInvitations[invitee];
    const claimed = !!claimedData;
    const status = determineInvitationStatus(claimed, revokeStatus);
    const secretKey = getInvitationSecretKey(invitee);

    // Extract claimed info if available
    const claimedInfo = typeof claimedData === 'object' ? claimedData as ClaimedInfo : null;

    return {
      hash: transaction.hash,
      status,
      invitee,
      date: moment(transaction.microTime).format(DATE_LONG),
      amount: Decimal.from(toAe(transaction.tx.arguments[2].value)).prettify(),
      revoked: !!revokeStatus,
      ...(typeof revokeStatus === "object" && {
        revokedAt: moment(revokeStatus.microTime).format(DATE_LONG),
        revokeTxHash: revokeStatus.hash,
      }),
      claimed,
      ...(claimedInfo && {
        claimedBy: claimedInfo.claimedBy,
        claimedAt: claimedInfo.claimedAt ? moment(claimedInfo.claimedAt).format(DATE_LONG) : undefined,
        claimTxHash: claimedInfo.claimTxHash,
      }),
      secretKey,
    };
  }, [getInvitationRevokeStatus, claimedInvitations, determineInvitationStatus, getInvitationSecretKey]);

  // Computed invitations with status
  const invitations = useMemo(() => {
    const formattedInvitations: InvitationStatus[] = [];
    for (const transaction of transactionList) {
      if (transaction?.tx?.function !== TX_FUNCTIONS.register_invitation_code)
        continue;
      const invitees =
        transaction.tx.arguments?.[0]?.value?.map((item: any) => item.value) || [];
      
      for (const invitee of invitees) {
        const invitationStatus = getInvitationStatus(invitee, transaction);
        formattedInvitations.push(invitationStatus);
      }
    }
    return formattedInvitations;
  }, [transactionList, getInvitationStatus]);

  // Load transactions from middleware
  const loadTransactionsFromMiddleware = useCallback(async (
    url: string,
    _transactionList: ITransaction[] = []
  ): Promise<ITransaction[]> => {
    const response = await fetchJson(url);
    const transactions: ITransaction[] = response.data
      ? (camelCaseKeysDeep(response.data) as unknown as ITransaction[])
      : [];
    _transactionList.push(...transactions);

    if (response.next) {
      return await loadTransactionsFromMiddleware(
        `${activeNetwork.middlewareUrl}${response.next}`,
        _transactionList
      );
    }
    return _transactionList;
  }, [activeNetwork]);

  const loadAccountInvitations = useCallback(async (
    address: string
  ): Promise<ITransaction[]> => {
    const url = `${activeNetwork.middlewareUrl}/v3/transactions?contract=${INVITATIONS_CONTRACT}&caller_id=${address}`;
    return await loadTransactionsFromMiddleware(url);
  }, [activeNetwork, loadTransactionsFromMiddleware]);

  // Manual refresh function for external use
  const refreshInvitationData = useCallback(async () => {
    if (!activeAccount) return;
    setLoading(true);
    try {
      const data = await loadAccountInvitations(activeAccount);
      setTransactionList(data);
    } catch (error) {
      console.error("Failed to load invitation data:", error);
      setTransactionList([]);
    } finally {
      setLoading(false);
    }
  }, [activeAccount, loadAccountInvitations, setLoading]);

  // Generate invite keys function
  const generateInviteKeys = useCallback(async (amount: number, invitesNumber = 1): Promise<string[]> => {
    if (!activeAccount) {
      throw new Error('No active account available');
    }

    if (!sdk) {
      throw new Error('SDK not initialized. Please connect your wallet and try again.');
    }

    const treasury = await getAffiliationTreasury(sdk as any);
    const keyPairs = new Array(+invitesNumber).fill(null).map(() => generateKeyPair());
    const redemptionFeeCover = 10n ** 15n;
    const inviteAmount = BigInt(Decimal.from(amount).bigNumber);

    // Register invitation codes on the blockchain
    await treasury.registerInvitationCode(
      keyPairs.map(({ publicKey }) => publicKey),
      redemptionFeeCover,
      inviteAmount
    );

    // Add to state and localStorage
    const now = Date.now();
    const newInvitations: InvitationInfo[] = keyPairs.map(({ secretKey, publicKey }) => ({
      inviter: activeAccount as Encoded.AccountAddress,
      invitee: publicKey as Encoded.AccountAddress,
      secretKey,
      amount,
      date: now,
    }));
    
    // Update state (this will also update localStorage via atomWithStorage)
    setInvitationList((prev) => [...newInvitations, ...prev]);
    
    // Trigger refresh to update invitation statuses
    triggerRefresh();

    return keyPairs.map(({ secretKey }) => secretKey);
  }, [activeAccount, sdk, setInvitationList, triggerRefresh]);

  // Remove stored invite function
  const removeStoredInvite = useCallback((invitee: Encoded.AccountAddress, secretKey?: string) => {
    if (!activeAccount) return;
    
    setInvitationList((prev) => 
      prev.filter((inv) => inv.secretKey !== secretKey || inv.invitee !== invitee)
    );
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
      console.error("Failed to revoke invitation:", error);
      if (error.message?.includes("INVITATION_NOT_REGISTERED")) {
        removeStoredInvite(invitation.invitee as `ak_${string}`, invitation.secretKey);
      } else if (error.message?.includes("ALREADY_REDEEMED")) {
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
  }, [location.hash, navigate, setInvitationCode]);

  // Handle URL hash changes for invitation codes
  useEffect(() => {
    const hash = location.hash;
    if (hash) {
      const hashParsed = new URLSearchParams(hash.replace('#', ''));
      const inviteCode = hashParsed.get(INVITE_CODE_QUERY_KEY);
      if (inviteCode) {
        setInvitationCode(inviteCode);
        navigate('/', { replace: true });
      }
    }
  }, [location.hash, navigate, setInvitationCode]);

  // Refresh data when active account changes or refresh is triggered
  useEffect(() => {
    if (!activeAccount) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await loadAccountInvitations(activeAccount);
        setTransactionList(data);
      } catch (error) {
        console.error("Failed to load invitation data:", error);
        setTransactionList([]);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [activeAccount, refreshTrigger, loadAccountInvitations, setLoading]);

  // Load claimed invitations when we have invitations to check
  useEffect(() => {
    if (invitations.length === 0) return;
    
    const loadClaimed = async () => {
      await Promise.all(
        invitations.map(async (invitation) => {
          try {
            const inviteeTransactions = await loadAccountInvitations(invitation.invitee);
            inviteeTransactions.forEach((tx: ITransaction) => {
              if (tx?.tx?.function === TX_FUNCTIONS.redeem_invitation_code) {
                // The claimer's wallet address is passed as the second argument to redeemInvitationCode(secretKey, claimerAddress).
                // The callerId is the invitation keypair address (invitee), NOT the actual claimer.
                const claimerAddress = tx.tx?.arguments?.[1]?.value as string | undefined;
                
                // Always mark as claimed when we see a redeem tx. If we can't extract claimer details,
                // fall back to boolean `true` (the atom type supports ClaimedInfo | boolean).
                setClaimedInvitations((prev) => ({
                  ...prev,
                  [invitation.invitee]: claimerAddress
                    ? {
                        claimedBy: claimerAddress,
                        claimedAt: tx.microTime,
                        claimTxHash: tx.hash,
                      } as ClaimedInfo
                    : true,
                }));
              }
            });
          } catch (error) {
            console.error(`Failed to load claimed status for ${invitation.invitee}:`, error);
          }
        })
      );
    };
    
    loadClaimed();
  }, [invitations.length, loadAccountInvitations, setClaimedInvitations]); // Only depend on length to avoid infinite loops

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
