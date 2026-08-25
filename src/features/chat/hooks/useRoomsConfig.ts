/**
 * Cached token-gated-rooms relay handshake config (`GET /api/rooms/config` via
 * the generated {@link RoomsService}): the groups_relay URL to open the chat
 * socket and the relay-admin (bot) hex pubkey for NIP-42 AUTH on private rooms.
 *
 * The relay URL is run through {@link ensureSecureRelayUrl} here so a non-TLS
 * `relay_url` rejects with a clear error instead of failing opaquely at the
 * socket in an https PWA. It is then checked against the
 * deploy-time relay allowlist ({@link isAllowedRelayOrigin}): an API-supplied
 * origin the CSP does not permit is refused here, with a reason, rather than
 * passing validation and being silently killed by `connect-src` at connect time.
 */
import { useQuery } from '@tanstack/react-query';

import { RoomsService } from '@/api/generated';
import { roomsQueryKeys } from '../api/rooms-query-keys';
import { ensureSecureRelayUrl } from '../nostr/relay-url';
import { isAllowedRelayOrigin } from '../core/relay-config';

/** Relay config rarely changes — cache it for the whole session-ish. */
const ROOMS_CONFIG_STALE_MS = 5 * 60 * 1000;

export function useRoomsConfig() {
  const query = useQuery({
    queryKey: roomsQueryKeys.config,
    queryFn: async () => {
      const config = await RoomsService.getRoomConfig();
      // Reject an insecure or off-allowlist relay URL up front rather than at connect time.
      const relayUrl = ensureSecureRelayUrl(config.relay_url);
      if (!isAllowedRelayOrigin(relayUrl)) {
        throw new Error(
          `Room relay ${new URL(relayUrl).origin} is not in the configured relay allowlist.`,
        );
      }
      return { ...config, relay_url: relayUrl };
    },
    staleTime: ROOMS_CONFIG_STALE_MS,
  });

  return {
    relayUrl: query.data?.relay_url,
    adminPubkey: query.data?.admin_pubkey,
    ...query,
  };
}
