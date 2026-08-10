/**
 * Canonical room-mute signing message — ported verbatim from
 * `superhero-app/src/features/chat/utils/room-mute-message.ts`. Pure.
 *
 * MUST stay byte-for-byte identical to the backend's
 * `superhero-api/src/token-gated-rooms/notifications/room-mute.message.ts` so the
 * server's `verifyMessageSignature` reproduces the same string.
 */
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

/**
 * Canonical hash of the room-mute body the user signs. Binds the signature to
 * the exact `(muted, mute_all)` delta so a captured nonce+sig cannot be replayed
 * with a swapped payload. `mute_all` is tri-state on the wire (`true`/`false`/
 * omitted = "don't touch"); the absent case serializes distinctly (`-`).
 *
 *   canonicalRoomMuteHash(true, undefined) => sha256('muted=1;mute_all=-')
 *   canonicalRoomMuteHash(false, false)    => sha256('muted=0;mute_all=0')
 */
export function canonicalRoomMuteHash(
  muted: boolean,
  muteAll?: boolean,
): string {
  let muteAllToken = '-';
  if (muteAll !== undefined) muteAllToken = muteAll ? '1' : '0';
  const canonical = `muted=${muted ? '1' : '0'};mute_all=${muteAllToken}`;
  return bytesToHex(sha256(utf8ToBytes(canonical)));
}

/**
 * Intent-bound message for the per-room mute flow. The `saleAddress` and the
 * body hash are committed to the signature so it can't be replayed for another
 * room or with swapped `muted`/`mute_all`.
 *
 *   Superhero Rooms
 *   Mute <saleAddress> for <address>
 *   body: <sha256(muted|mute_all)>
 *   nonce: <nonce>
 */
export function buildRoomMuteMessage(
  address: string,
  nonce: string,
  saleAddress: string,
  muted: boolean,
  muteAll?: boolean,
): string {
  return `Superhero Rooms\nMute ${saleAddress} for ${address}\nbody: ${canonicalRoomMuteHash(
    muted,
    muteAll,
  )}\nnonce: ${nonce}`;
}
