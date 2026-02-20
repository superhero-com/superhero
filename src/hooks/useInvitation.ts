import {
  useState, useEffect, useCallback, useMemo,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MemoryAccount } from '@aeternity/aepp-sdk';
import type { Encoded } from '@aeternity/aepp-sdk';

import { Decimal } from '../libs/decimal';
import { useAccount } from './useAccount';
import { useCommunityFactory } from './useCommunityFactory';

const INVITE_CODE_QUERY_KEY = 'invite_code';
const LS_KEY_INVITE_LIST = 'invite_list';
const LS_KEY_INVITE_CODE = 'invite_code';

export interface InvitationInfo {
  inviter: Encoded.AccountAddress;
  invitee: Encoded.AccountAddress;
  secretKey?: string;
  date: number;
  amount: number;
}

// LocalStorage helper functions
function readAllInvitations(): InvitationInfo[] {
  try {
    const raw = localStorage.getItem(LS_KEY_INVITE_LIST);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch {
    return [];
  }
}

function writeAllInvitations(list: InvitationInfo[]) {
  localStorage.setItem(LS_KEY_INVITE_LIST, JSON.stringify(list));
}

function getActiveAccountInviteList(inviter: Encoded.AccountAddress): InvitationInfo[] {
  return readAllInvitations().filter((x) => x.inviter === inviter);
}

function prepareInviteLink(secretKey: string): string {
  // eslint-disable-next-line no-restricted-globals
  return `${location.protocol}//${location.host}#${INVITE_CODE_QUERY_KEY}=${secretKey}`;
}

let initialized = false;

export function useInvitation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getAffiliationTreasury } = useCommunityFactory();
  const { activeAccount } = useAccount();

  const [invitationCode, setInvitationCode] = useState<string | undefined>();
  const [invitationList, setInvitationList] = useState<InvitationInfo[]>([]);

  // Initialize invitation list from localStorage
  useEffect(() => {
    if (!initialized) {
      initialized = true;
      try {
        const storedList = readAllInvitations();
        setInvitationList(storedList);
      } catch {
        // Handle error silently
      }
    }
  }, []);

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

    // Add to localStorage and update state
    const now = Date.now();
    const newInvitations: InvitationInfo[] = keyPairs.map(({ secretKey, address }) => ({
      inviter: activeAccount as Encoded.AccountAddress,
      invitee: address as Encoded.AccountAddress,
      secretKey,
      amount,
      date: now,
    }));

    // Update localStorage
    const currentList = readAllInvitations();
    newInvitations.forEach((invitation) => {
      currentList.unshift(invitation);
    });
    writeAllInvitations(currentList);

    // Update local state
    setInvitationList(currentList);

    return keyPairs.map(({ secretKey }) => secretKey);
  }, [activeAccount, getAffiliationTreasury]);

  // Remove stored invite function
  const removeStoredInvite = useCallback((invitee: Encoded.AccountAddress, secretKey?: string) => {
    if (!activeAccount) return;

    const list = readAllInvitations();
    const filtered = list.filter(
      (inv) => inv.secretKey !== secretKey || inv.invitee !== invitee,
    );
    writeAllInvitations(filtered);

    // Update local state
    setInvitationList(filtered);
  }, [activeAccount]);

  // Reset invite code function
  const resetInviteCode = useCallback(() => {
    localStorage.removeItem(LS_KEY_INVITE_CODE);
    const currentHash = location.hash;
    if (currentHash) {
      navigate({ hash: '' });
    }
    setInvitationCode(undefined);
  }, [location.hash, navigate]);

  // Load invitation code from localStorage on mount
  useEffect(() => {
    const code = localStorage.getItem(LS_KEY_INVITE_CODE);
    if (code) {
      setInvitationCode(code);
    }
  }, []);

  // Load invitation list when active account changes
  useEffect(() => {
    if (activeAccount) {
      setInvitationList(getActiveAccountInviteList(activeAccount as Encoded.AccountAddress));
    } else {
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
        localStorage.setItem(LS_KEY_INVITE_CODE, inviteCode);
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
