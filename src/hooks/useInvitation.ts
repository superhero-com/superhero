import {
  useState, useEffect, useCallback, useMemo,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MemoryAccount } from '@aeternity/aepp-sdk';
import type { Encoded } from '@aeternity/aepp-sdk';

import { Decimal } from '../libs/decimal';
import { normalizeSecretKey } from '../utils/secretKey';
import { useAccount } from './useAccount';
import { useCommunityFactory } from './useCommunityFactory';

const INVITE_CODE_QUERY_KEY = 'invite_code';

export interface InvitationInfo {
  inviter: Encoded.AccountAddress;
  invitee: Encoded.AccountAddress;
  secretKey?: string;
  date: number;
  amount: number;
}

function prepareInviteLink(secretKey: string): string {
  // eslint-disable-next-line no-restricted-globals
  return `${location.protocol}//${location.host}#${INVITE_CODE_QUERY_KEY}=${normalizeSecretKey(secretKey)}`;
}

export function useInvitation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getAffiliationTreasury } = useCommunityFactory();
  const { activeAccount } = useAccount();

  const [invitationCode, setInvitationCode] = useState<string | undefined>();
  const [invitationList, setInvitationList] = useState<InvitationInfo[]>([]);

  // Computed equivalent - active account's invitations
  const activeAccountInviteList = useMemo(() => {
    if (!activeAccount) return [];
    return invitationList.filter(({ inviter }) => inviter === activeAccount);
  }, [invitationList, activeAccount]);

  // Generate invite keys function
  const generateInviteKeys = useCallback(async (
    amount: number,
    invitesNumber = 1,
  ): Promise<string[]> => {
    if (!activeAccount) {
      throw new Error('No active account available');
    }

    const affiliationTreasury = await getAffiliationTreasury();
    const amountValue = BigInt(Decimal.from(amount).bigNumber);
    const keyPairs = new Array(+invitesNumber)
      .fill(null)
      .map(() => MemoryAccount.generate());

    const redemptionFeeCover = 10n ** 15n;

    await affiliationTreasury.registerInvitationCode(
      keyPairs.map(({ address }) => address),
      redemptionFeeCover,
      amountValue,
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

    return keyPairs.map(({ secretKey }) => secretKey);
  }, [activeAccount, getAffiliationTreasury]);

  // Remove stored invite function
  const removeStoredInvite = useCallback((invitee: Encoded.AccountAddress, secretKey?: string) => {
    if (!activeAccount) return;

    setInvitationList((prev) => prev
      .filter((inv) => inv.secretKey !== secretKey || inv.invitee !== invitee));
  }, [activeAccount]);

  // Reset invite code function
  const resetInviteCode = useCallback(() => {
    const currentHash = location.hash;
    if (currentHash) {
      navigate({ hash: '' });
    }
    setInvitationCode(undefined);
  }, [location.hash, navigate]);

  // Clear current-session invitations when active account disconnects.
  useEffect(() => {
    if (!activeAccount) {
      setInvitationList([]);
    }
  }, [activeAccount]);

  // Handle URL hash changes for invitation codes (equivalent to Vue watch)
  useEffect(() => {
    const { hash } = location;
    if (hash) {
      const hashParsed = new URLSearchParams(hash.replace('#', ''));
      const inviteCode = hashParsed.get(INVITE_CODE_QUERY_KEY);
      if (inviteCode) {
        setInvitationCode(inviteCode);
        navigate('/', { replace: true }); // Navigate to home route
      }
    }
  }, [location, location.hash, navigate]);

  return {
    invitationCode,
    invitationList,
    activeAccountInviteList,
    generateInviteKeys,
    resetInviteCode,
    removeStoredInvite,
    prepareInviteLink,
  };
}
