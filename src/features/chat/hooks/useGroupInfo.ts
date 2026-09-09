/**
 * useGroupInfo — aggregates a token-gated room's facts for the room-info screen,
 * keyed by its **sale address** (`ct_…`).
 *
 * Source of truth = the **superhero-api** roster (`GET /api/rooms/:sale/members`
 * via the generated {@link RoomsService} → `member_address`, `member_pubkey`,
 * `role`, `relay_state`, `eligible`). The relay (kind 39000 metadata) is read
 * only as optional liveness enrichment — never as the authoritative roster.
 *
 * Web note: the mobile app enriches roster rows with kind-0 nostr profiles via a
 * ProfileService that has no web counterpart yet, so member display names fall
 * back to the roster æ address / shortened pubkey (subtitle precedence:
 * roster `member.address` > shortened pubkey; addresses always shortened).
 */
import { useQuery } from '@tanstack/react-query';
import {
  useCallback, useEffect, useMemo, useState,
} from 'react';

import { RoomsService, RoomMemberViewDto } from '@/api/generated';
import { useAccount } from '@/hooks';
import { roomsQueryKeys } from '../api/rooms-query-keys';
import { GatedRoomClient, type GroupMetadata } from '../nostr/gated-room';
import { shortenPubkey } from '../utils/formatters';
import { useRoomsConfig } from './useRoomsConfig';
import { useRoomSession } from './useRoomSession';

export interface GroupMember {
  pubkey: string | null;
  name: string;
  isAdmin: boolean;
  roles: string[];
  isMe: boolean;
  /** Account (æ) address backing this member, from the API roster. */
  address?: string;
  relayState?: string;
  eligible?: boolean;
  /** Eligible holder not yet `added` to the relay (e.g. hasn't linked a key). */
  isInvited: boolean;
}

interface MembersPage {
  items: RoomMemberViewDto[];
}

const MEMBERS_STALE_MS = 30 * 1000;

export function useGroupInfo(saleAddress: string) {
  const { activeAccount } = useAccount();
  const { identity, pubkey } = useRoomSession();
  const { relayUrl } = useRoomsConfig();
  const myAddress = activeAccount;

  const [metadata, setMetadata] = useState<GroupMetadata | null>(null);

  // --- Roster: source of truth is the API. ---------------------------------
  const membersQuery = useQuery({
    queryKey: roomsQueryKeys.members(saleAddress, true),
    enabled: !!saleAddress,
    staleTime: MEMBERS_STALE_MS,
    queryFn: async () => {
      const page = (await RoomsService.listRoomMembers({
        saleAddress,
        includePending: true,
      })) as unknown as MembersPage;
      return page.items;
    },
  });
  const apiMembers: RoomMemberViewDto[] = useMemo(
    () => membersQuery.data ?? [],
    [membersQuery.data],
  );

  // --- Relay metadata (optional liveness/decoration enrichment). -----------
  const loadRelayMetadata = useCallback(async () => {
    if (!saleAddress || !relayUrl) return;
    const client = new GatedRoomClient(identity, relayUrl);
    try {
      const meta = await client.getGroupMetadata(saleAddress).catch(() => null);
      setMetadata(meta);
    } finally {
      client.close();
    }
  }, [saleAddress, relayUrl, identity]);

  useEffect(() => {
    loadRelayMetadata();
  }, [loadRelayMetadata]);

  // Map one API roster row → GroupMember. Invited holders may have a null pubkey
  // (haven't linked a Nostr key yet), so fall back to the æ address.
  const toMember = useCallback(
    (m: RoomMemberViewDto): GroupMember => {
      const pk = m.member_pubkey;
      const isAdmin = m.role === RoomMemberViewDto.role.ADMIN;
      return {
        pubkey: pk,
        name: shortenPubkey(pk ?? m.member_address),
        isAdmin,
        roles: isAdmin ? ['admin'] : [],
        isMe:
          (!!pk && pk === pubkey)
          || (!!myAddress && m.member_address === myAddress),
        address: m.member_address,
        relayState: m.relay_state,
        eligible: m.eligible,
        isInvited: m.relay_state !== RoomMemberViewDto.relay_state.ADDED,
      } satisfies GroupMember;
    },
    [pubkey, myAddress],
  );

  // Hide rows that are leaving/gone — neither active nor invited.
  const visible = useMemo(
    () => apiMembers.filter(
      (m) => m.relay_state !== RoomMemberViewDto.relay_state.REMOVED
          && m.relay_state !== RoomMemberViewDto.relay_state.PENDING_REMOVE,
    ),
    [apiMembers],
  );

  // ACTIVE (Members) = on the relay roster.
  const members: GroupMember[] = useMemo(
    () => visible
      .filter((m) => m.relay_state === RoomMemberViewDto.relay_state.ADDED)
      .map(toMember)
      .sort((a, b) => {
        if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
        if (a.isMe !== b.isMe) return a.isMe ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    [visible, toMember],
  );

  // INVITED = eligible holders not yet added (mostly: haven't linked a key).
  const invited: GroupMember[] = useMemo(
    () => visible
      .filter(
        (m) => m.eligible
            && m.relay_state !== RoomMemberViewDto.relay_state.ADDED,
      )
      .map(toMember)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [visible, toMember],
  );

  const adminCount = useMemo(
    () => apiMembers.filter(
      (m) => m.relay_state === RoomMemberViewDto.relay_state.ADDED
          && m.role === RoomMemberViewDto.role.ADMIN,
    ).length,
    [apiMembers],
  );

  const refresh = useCallback(async () => {
    await Promise.all([membersQuery.refetch(), loadRelayMetadata()]);
  }, [membersQuery, loadRelayMetadata]);

  return {
    saleAddress,
    name: metadata?.name ?? saleAddress,
    about: metadata?.about,
    picture: metadata?.picture,
    isPrivate: metadata?.isPrivate ?? false,
    isClosed: metadata?.isClosed ?? false,
    members,
    memberCount: members.length,
    invited,
    invitedCount: invited.length,
    adminCount,
    isLoading: membersQuery.isLoading,
    refresh,
  };
}
