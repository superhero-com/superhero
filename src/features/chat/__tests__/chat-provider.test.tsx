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
import type { DirectMessage } from '../core/types';

const UNLOCKED = { pubkey: 'me', identity: {}, isUnlocked: true };
const LOCKED = { pubkey: null, identity: null, isUnlocked: false };

const mocks = vi.hoisted(() => ({
  session: null as unknown,
  store: null as unknown,
  fetchEvents: vi.fn(),
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

    subscribe = mocks.noop;

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
  return { rerender: () => view.rerender(<Provider store={store}>{ui()}</Provider>) };
};

beforeEach(async () => {
  vi.useFakeTimers();
  mocks.session = UNLOCKED;
  mocks.clients = 0;
  mocks.fetchEvents.mockReset();
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
