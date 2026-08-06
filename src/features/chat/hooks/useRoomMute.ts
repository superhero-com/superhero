/**
 * useRoomMute — per-room mute: read `{ muted, mute_all }` and persist a change
 * behind one signed write (challenge → rebuild the message locally → sign with
 * the active account → POST), all through the generated {@link RoomsService}. On
 * an expired/consumed nonce (400/401/410) it retries once with a fresh challenge.
 *
 * `muteAll` is tri-state: pass `true`/`false` to also flip the account-wide
 * `room-messages` switch, or omit it to leave that untouched.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError, RoomsService, type RoomMuteViewDto } from '@/api/generated';
import { useAeSdk } from '@/hooks';
import { useTransactionNotification } from '@/features/transaction-notification';
import { roomsQueryKeys } from '../api/rooms-query-keys';
import { buildRoomMuteMessage } from '../utils/room-mute-message';

const ROOM_MUTE_STALE_MS = 30 * 1000;

/** A challenge response from `POST .../mute/challenge` (generated type is `any`). */
interface RoomMuteChallenge {
  nonce: string;
  expiresAt: string;
}

export function useRoomMute(saleAddress: string | undefined) {
  const { activeAccount, signMessage } = useAeSdk();
  const { notifyError } = useTransactionNotification();
  const queryClient = useQueryClient();

  const address = activeAccount;

  const query = useQuery({
    queryKey: roomsQueryKeys.mute(saleAddress, address),
    queryFn: () => RoomsService.getRoomMute({ saleAddress: saleAddress!, address: address! }),
    enabled: !!saleAddress && !!address,
    staleTime: ROOM_MUTE_STALE_MS,
  });

  const mutation = useMutation({
    mutationFn: async ({
      muted,
      muteAll,
    }: {
      muted: boolean;
      muteAll?: boolean;
    }): Promise<RoomMuteViewDto> => {
      if (!saleAddress) throw new Error('No room');
      if (!address) throw new Error('No active account');

      const submit = async (): Promise<RoomMuteViewDto> => {
        const challenge = (await RoomsService.requestRoomMuteChallenge({
          saleAddress,
          requestBody: { address },
        })) as RoomMuteChallenge;
        const message = buildRoomMuteMessage(
          address,
          challenge.nonce,
          saleAddress,
          muted,
          muteAll,
        );
        const signature = await signMessage(message);
        return RoomsService.setRoomMute({
          saleAddress,
          requestBody: {
            address,
            nonce: challenge.nonce,
            signature,
            muted,
            ...(muteAll !== undefined ? { mute_all: muteAll } : {}),
          },
        });
      };

      try {
        return await submit();
      } catch (err) {
        if (err instanceof ApiError && [400, 401, 410].includes(err.status)) {
          return submit();
        }
        throw err;
      }
    },
    onSuccess: (result) => {
      queryClient.setQueryData(roomsQueryKeys.mute(saleAddress, address), result);
      queryClient.invalidateQueries({ queryKey: roomsQueryKeys.list(address) });
    },
    onError: (err) => {
      notifyError(
        err instanceof Error ? err.message : 'Could not update room mute.',
      );
    },
  });

  return {
    muted: query.data?.muted ?? false,
    muteAll: query.data?.mute_all ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    isSaving: mutation.isPending,
    setMuted: (muted: boolean, muteAll?: boolean) => mutation.mutate({ muted, muteAll }),
  };
}
