import { act, renderHook, waitFor } from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import type { NostrEvent } from '../../core/types';
import { GatedRoomPublishError } from '../../nostr/gated-room-error';
import { useGatedRoom } from '../useGatedRoom';

const mocks = vi.hoisted(() => ({
  metadata: vi.fn(async () => null),
  history: vi.fn(),
  send: vi.fn(),
  subscribe: vi.fn(),
  close: vi.fn(),
  session: { identity: {}, pubkey: 'me', isUnlocked: true },
  config: { relayUrl: 'ws://localhost:8000', error: null as Error | null, refetch: vi.fn() },
}));
vi.mock('../useRoomsConfig', () => ({ useRoomsConfig: () => mocks.config }));
vi.mock('../useRoomSession', () => ({ useRoomSession: () => mocks.session }));
vi.mock('../../nostr/gated-room', async () => ({
  GatedRoomPublishError: (await import('../../nostr/gated-room-error')).GatedRoomPublishError,
  GatedRoomClient: class {
    relayPubkey = null;

    getGroupMetadata = mocks.metadata;

    fetchRoomHistory = mocks.history;

    sendRoomMessage = mocks.send;

    subscribeRoom = mocks.subscribe;

    close = mocks.close;
  },
}));
const event: NostrEvent = {
  id: 'message-id',
  pubkey: 'me',
  created_at: 1234,
  kind: 9,
  tags: [['h', 'room']],
  content: 'hello',
  sig: '',
};
beforeEach(() => {
  mocks.history.mockReset().mockResolvedValue([]);
  mocks.send.mockReset();
  mocks.subscribe.mockReset().mockResolvedValue({ close: vi.fn() });
  mocks.config.error = null;
});
describe('room delivery state', () => {
  it('merges an echo arriving before the publish acknowledgement', async () => {
    const { result } = renderHook(() => useGatedRoom('room', { readable: true }));
    await waitFor(() => expect(result.current.isReady).toBe(true));
    mocks.send.mockImplementation(async () => {
      mocks.subscribe.mock.calls[0][1](event);
      return event.id;
    });
    await act(() => result.current.sendMessage('hello'));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({ eventId: event.id, status: 'sent' });
  });
  it('surfaces denied private history and allows a retry after membership changes', async () => {
    mocks.history.mockRejectedValueOnce(new GatedRoomPublishError('restricted: not a member'));
    const { result } = renderHook(() => useGatedRoom('room', { readable: true, isPrivate: true }));
    await waitFor(() => expect(result.current.access).toBe('not-member'));
    expect(result.current.isReady).toBe(false);
    expect(result.current.error?.message).toContain('not a member');
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.isReady).toBe(true));
    expect(result.current.error).toBeNull();
  });
  it('surfaces asynchronous subscription rejection instead of reporting an empty ready room', async () => {
    const { result } = renderHook(() => useGatedRoom('room', { readable: true }));
    await waitFor(() => expect(result.current.isReady).toBe(true));
    act(() => mocks.subscribe.mock.calls[0][2].onError(new Error('Disconnected')));
    expect(result.current.isReady).toBe(false);
    expect(result.current.error?.message).toBe('Disconnected');
  });
  it('ignores an earlier-history response after switching rooms', async () => {
    mocks.history.mockResolvedValueOnce(Array.from({ length: 50 }, (_, n) => ({
      ...event, id: `initial-${n}`,
    })));
    const { result, rerender } = renderHook(
      ({ room }) => useGatedRoom(room, { readable: true }),
      { initialProps: { room: 'room' } },
    );
    await waitFor(() => expect(result.current.isReady).toBe(true));
    let finishHistory!: (events: NostrEvent[]) => void;
    mocks.history.mockImplementationOnce(() => new Promise<NostrEvent[]>((resolve) => {
      finishHistory = resolve;
    }));
    let pending!: Promise<void>;
    act(() => { pending = result.current.loadEarlier(); });
    rerender({ room: 'another-room' });
    await waitFor(() => expect(result.current.isReady).toBe(true));
    await act(async () => {
      finishHistory([{ ...event, id: 'old-room-secret', content: 'Old room history' }]);
      await pending;
    });
    expect(result.current.messages).toEqual([]);
  });
});
