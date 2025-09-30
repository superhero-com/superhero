import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import type { Encoded } from '@aeternity/aepp-sdk';

export interface InvitationInfo {
  inviter: Encoded.AccountAddress;
  invitee: Encoded.AccountAddress;
  secretKey?: string;
  date: number;
  amount: number;
}

export interface InvitationStatus {
  hash: string;
  status: "created" | "claimed" | "revoked";
  invitee: string;
  date?: string;
  amount: string;
  revoked: boolean;
  revokedAt?: string;
  revokeTxHash?: string;
  claimed: boolean;
  secretKey?: string;
}

// Persistent storage for generated invitations
export const invitationListAtom = atomWithStorage<InvitationInfo[]>('invite_list', []);

// Current invitation code from URL
export const invitationCodeAtom = atomWithStorage<string | undefined>('invite_code', undefined);

// Claimed invitations cache
export const claimedInvitationsAtom = atom<Record<string, boolean>>({});

// Recently revoked invitations (for optimistic UI updates)
export const recentlyRevokedInvitationsAtom = atom<string[]>([]);

// Loading states
export const invitationLoadingAtom = atom<boolean>(false);
export const invitationRefreshTriggerAtom = atom<number>(0);

// Computed atom for active account invitations
export const activeAccountInvitationsAtom = atom<(get) => InvitationInfo[]>((get) => {
  const invitations = get(invitationListAtom);
  // This will be filtered by the hook based on active account
  return invitations;
});

// Atom to trigger refresh of invitation data
export const refreshInvitationsAtom = atom(
  null,
  (get, set) => {
    const current = get(invitationRefreshTriggerAtom);
    set(invitationRefreshTriggerAtom, current + 1);
  }
);
