import { describe, it, expect } from 'vitest';

import { RoomViewDto } from '@/api/generated';
import { roomStatus } from '../components/RoomStatusChip';
import type { GatedRoomSummary } from '../hooks/useGatedRooms';

const RelayState = RoomViewDto.relay_state;

function room(partial: Partial<GatedRoomSummary>): GatedRoomSummary {
  return {
    sale_address: 'ct_x',
    token_address: 'ct_t',
    symbol: 'WORDS',
    is_private: false,
    min_token_threshold: '0',
    is_community: true,
    role: 'member',
    relay_state: 'removed',
    member_pubkey: null,
    readable: false,
    groupId: 'ct_x',
    name: 'WORDS',
    isPrivate: false,
    ...partial,
  } as GatedRoomSummary;
}

/** Chip derivation from relay_state + readable, default-DENY. */
describe('roomStatus', () => {
  it('is member only when readable', () => {
    expect(
      roomStatus(room({ readable: true, relay_state: RelayState.ADDED, member_pubkey: 'ab' })),
    ).toBe('member');
  });

  it('is pending while provisioning or eligible-but-unlinked', () => {
    expect(roomStatus(room({ relay_state: RelayState.PENDING_ADD }))).toBe('pending');
    expect(roomStatus(room({ relay_state: RelayState.ADDED, member_pubkey: null }))).toBe(
      'pending',
    );
  });

  it('is locked otherwise', () => {
    expect(
      roomStatus(room({ relay_state: RelayState.REMOVED, member_pubkey: 'ab' })),
    ).toBe('locked');
  });
});
