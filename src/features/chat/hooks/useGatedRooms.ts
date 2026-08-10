/**
 * useGatedRooms — the "Communities" list: the token-gated rooms the active
 * account is eligible for. The **superhero-api is the source of truth**
 * (`GET /api/rooms?address` via the generated {@link RoomsService}): each room's
 * `sale_address` (the NIP-29 group id, verbatim), `symbol`, `is_private`,
 * `relay_state`, `member_pubkey`, `readable`, `role` and `min_token_threshold`.
 */
import { useQuery } from '@tanstack/react-query';

import { RoomsService, type RoomViewDto } from '@/api/generated';
import { useAccount } from '@/hooks';
import { roomsQueryKeys } from '../api/rooms-query-keys';

/** Lists go a little stale; refetched on focus / account switch. */
const ROOMS_STALE_MS = 30 * 1000;

/** A generated list response, narrowed to the rows we read. */
interface RoomsPage {
  items: RoomViewDto[];
}

/**
 * A room as exposed to the UI: the authoritative {@link RoomViewDto} plus a few
 * derived display aliases. `groupId` is the `sale_address` verbatim.
 */
export interface GatedRoomSummary extends RoomViewDto {
  /** Alias of `sale_address` (the NIP-29 group id). */
  groupId: string;
  /** Display label — the token symbol. */
  name: string;
  about?: string;
  /** Alias of `is_private`. */
  isPrivate: boolean;
}

function toSummary(room: RoomViewDto): GatedRoomSummary {
  return {
    ...room,
    groupId: room.sale_address,
    name: room.symbol,
    about: undefined,
    isPrivate: room.is_private,
  };
}

export function useGatedRooms() {
  const { activeAccount } = useAccount();
  const address = activeAccount;

  const query = useQuery({
    queryKey: roomsQueryKeys.list(address),
    enabled: !!address,
    staleTime: ROOMS_STALE_MS,
    queryFn: async () => {
      const page = (await RoomsService.listEligibleRooms({
        address: address!,
      })) as unknown as RoomsPage;
      return page.items.map(toSummary);
    },
  });

  return {
    rooms: query.data ?? [],
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    refresh: query.refetch,
  };
}

/**
 * Look up a single room summary from the eligible list. Returns `undefined`
 * while the list is loading or when the account is not eligible for the room —
 * callers resolve `readable` default-DENY (`room?.readable ?? false`).
 */
export function useGatedRoomSummary(saleAddress: string | undefined) {
  const {
    rooms, isLoading, isFetching, refetch,
  } = useGatedRooms();
  const room = saleAddress
    ? rooms.find((r) => r.sale_address === saleAddress)
    : undefined;
  return {
    room, isLoading, isFetching, refetch,
  };
}
