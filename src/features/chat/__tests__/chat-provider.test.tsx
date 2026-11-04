import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { Provider, createStore, useAtomValue } from 'jotai';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';

import { ChatProvider } from '../provider/chat.provider';
import { useChat } from '../hooks/useChat';
import { dmMessagesAtom } from '../domains/direct-messages/dm.state';
import { saveMessages } from '../domains/direct-messages/dm.storage';
import { saveChatManifest } from '../domains/conversations/conversations.storage';
import { clearChatStore, setChatStore } from '../storage/chat-store';
import { createInMemoryKeyValueStore, type KeyValueStore } from '../storage/kv-store';
import type { DirectMessage, NostrEvent, NostrFilter } from '../core/types';

const identity = {
  getPublicKey: async () => 'me',
  nip04Decrypt: async (_peer: string, content: string) => content,
};
const UNLOCKED = { pubkey: 'me', identity, isUnlocked: true };
const LOCKED = { pubkey: null, identity: null, isUnlocked: false };

const mocks = vi.hoisted(() => ({
  session: null as unknown,
  store: null as unknown,
  fetchEvents: vi.fn(),
  subscribe: vi.fn(),
  noop: () => {},
  clients: 0,
}));

vi.mock('@/hooks', () => ({ useAccount: () => ({ activeAccount: 'ak_me' }) }));
vi.mock('../hooks/useRoomSession', () => ({ useRoomSession: () => mocks.session }));
vi.mock('../hooks/useChatServiceWorker', () => ({ useChatServiceWorker: () => {} }));
vi.mock('../session/room-session', () => ({
  roomKeySession: { keys: { privateKey: 'key' } },
  lockRoomSession: vi.fn(),
}));
vi.mock('../storage/message-storage-key', () => ({ deriveMessageStorageKey: async () => ({}) }));
vi.mock('../storage/encrypted-kv-store', () => ({ createEncryptedKeyValueStore: (inner: unknown) => inner }));
vi.mock('../storage/kv-store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../storage/kv-store')>()),
  createIndexedDbKeyValueStore: () => mocks.store,
}));
vi.mock('../nostr/nostr-client', () => ({
  NostrClient: class {
    constructor() { mocks.clients += 1; }

    fetchEvents = mocks.fetchEvents;

    subscribe = mocks.subscribe;

    on = mocks.noop;

    destroy = mocks.noop;

    updateRelays = mocks.noop;
  },
}));

const stored: DirectMessage = {
  id: 'm1',
  type: 'dm',
  content: 'hello from before',
  timestamp: 1,
  fromPubkey: 'peer',
  toPubkey: 'me',
  isFromMe: false,
} as DirectMessage;

const Probe = () => {
  const { isConnected, error } = useChat();
  const messages = useAtomValue(dmMessagesAtom);
  return (
    <div data-testid="state">
      {JSON.stringify({ isConnected, error, messages: messages.peer?.length ?? 0 })}
    </div>
  );
};

const state = () => JSON.parse(screen.getByTestId('state').textContent || '{}');
const flush = (ms = 0) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const ui = () => (
  <ChatProvider><Probe /></ChatProvider>
);

const renderChat = async () => {
  const store = createStore();
  const view = render(<Provider store={store}>{ui()}</Provider>);
  await flush();
  return { store, rerender: () => view.rerender(<Provider store={store}>{ui()}</Provider>) };
};

beforeEach(async () => {
  vi.useFakeTimers();
  mocks.session = UNLOCKED;
  mocks.clients = 0;
  mocks.fetchEvents.mockReset();
  mocks.subscribe.mockReset();
  const store = createInMemoryKeyValueStore();
  mocks.store = store;
  setChatStore(store as KeyValueStore);
  await saveChatManifest({ dm_peer: { type: 'dm', pubkey: 'peer', lastActivity: 1 } });
  await saveMessages('peer', [stored]);
  clearChatStore();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ChatProvider startup', () => {
  it('keeps local history, shows the error and retries when no relay answers', async () => {
    mocks.fetchEvents.mockRejectedValueOnce(new Error('relay down')).mockResolvedValue([]);
    await renderChat();

    expect(state()).toEqual({ isConnected: false, error: 'relay down', messages: 1 });

    await flush(5000);
    expect(mocks.clients).toBe(2);
    expect(state()).toEqual({ isConnected: true, error: null, messages: 1 });
  });

  it('wipes the kept history and stops retrying when the session locks', async () => {
    mocks.fetchEvents.mockRejectedValue(new Error('relay down'));
    const { rerender } = await renderChat();
    expect(state().messages).toBe(1);

    mocks.session = LOCKED;
    rerender();
    await flush();
    expect(state()).toMatchObject({ isConnected: false, messages: 0 });

    await flush(60_000);
    expect(mocks.clients).toBe(1);
  });

  it('keeps the periodic refresh going after a failed refresh', async () => {
    mocks.fetchEvents.mockResolvedValue([]);
    await renderChat();
    expect(state().isConnected).toBe(true);
    const startupCalls = mocks.fetchEvents.mock.calls.length;

    mocks.fetchEvents.mockRejectedValueOnce(new Error('relay down'));
    await flush(500);
    expect(mocks.fetchEvents).toHaveBeenCalledTimes(startupCalls + 1);

    await flush(10_000);
    expect(mocks.fetchEvents).toHaveBeenCalledTimes(startupCalls + 2);
  });
});

describe('ChatProvider DM receive', () => {
  const PEER = 'a'.repeat(64);
  const dm = (id: string): NostrEvent => ({
    id, kind: 4, pubkey: PEER, tags: [['p', 'me']], content: id, created_at: 1, sig: '',
  });
  const isProfileLookup = (filters: NostrFilter[]) => (
    filters.length === 1 && filters[0].kinds?.[0] === 0 && filters[0].authors?.[0] === PEER
  );

  it('does not hold DMs behind a profile lookup, and looks each peer up once', async () => {
    mocks.fetchEvents.mockImplementation(async (filters: NostrFilter[]) => {
      if (isProfileLookup(filters)) return new Promise(() => {});
      return filters[0]['#p'] ? [dm('d1'), dm('d2'), dm('d3')] : [];
    });
    const { store } = await renderChat();
    await flush(100);

    expect(store.get(dmMessagesAtom)[PEER]?.map((m) => m.content)).toEqual(['d1', 'd2', 'd3']);
    const lookups = (fn: typeof mocks.subscribe) => (
      fn.mock.calls.filter(([filters]) => isProfileLookup(filters))
    );
    expect(lookups(mocks.fetchEvents)).toHaveLength(1);
    expect(lookups(mocks.subscribe)).toHaveLength(1);
  });
});
