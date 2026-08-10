/**
 * Cached token-gated-rooms relay handshake config (`GET /api/rooms/config` via
 * the generated {@link RoomsService}): the groups_relay URL to open the chat
 * socket and the relay-admin (bot) hex pubkey for NIP-42 AUTH on private rooms.
 *
 * The relay URL is run through {@link ensureSecureRelayUrl} here so a non-TLS
 * `relay_url` rejects with a clear error instead of failing opaquely at the
 * socket in an https PWA (precondition 2).
 */
import { useQuery } from '@tanstack/react-query';

import { RoomsService } from '@/api/generated';
import { roomsQueryKeys } from '../api/rooms-query-keys';
import { ensureSecureRelayUrl } from '../nostr/relay-url';

/** Relay config rarely changes — cache it for the whole session-ish. */
const ROOMS_CONFIG_STALE_MS = 5 * 60 * 1000;

export function useRoomsConfig() {
  const query = useQuery({
    queryKey: roomsQueryKeys.config,
    queryFn: async () => {
      const config = await RoomsService.getRoomConfig();
      // Reject an insecure relay URL up front rather than at connect time.
      return { ...config, relay_url: ensureSecureRelayUrl(config.relay_url) };
    },
    staleTime: ROOMS_CONFIG_STALE_MS,
  });

  return {
    relayUrl: query.data?.relay_url,
    adminPubkey: query.data?.admin_pubkey,
    ...query,
  };
}
