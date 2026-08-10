import { describe, it, expect } from 'vitest';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

import {
  canonicalRoomMuteHash,
  buildRoomMuteMessage,
} from '../utils/room-mute-message';

const hashOf = (s: string) => bytesToHex(sha256(utf8ToBytes(s)));

/**
 * Must stay byte-for-byte identical to the backend `room-mute.message.ts`. The
 * tri-state `mute_all` (`1`/`0`/`-` = omitted) is the replay guard.
 */
describe('room-mute canonical message', () => {
  it('serializes the mute_all tri-state distinctly', () => {
    expect(canonicalRoomMuteHash(true, undefined)).toBe(hashOf('muted=1;mute_all=-'));
    expect(canonicalRoomMuteHash(false, false)).toBe(hashOf('muted=0;mute_all=0'));
    expect(canonicalRoomMuteHash(true, true)).toBe(hashOf('muted=1;mute_all=1'));
  });

  it('binds the room, address and body hash into the message', () => {
    const msg = buildRoomMuteMessage('ak_me', 'nonce123', 'ct_room', true);
    expect(msg).toBe(
      `Superhero Rooms\nMute ct_room for ak_me\nbody: ${hashOf(
        'muted=1;mute_all=-',
      )}\nnonce: nonce123`,
    );
  });
});
