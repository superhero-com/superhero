import React from 'react';
import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { Provider, createStore, useAtomValue } from 'jotai';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

import { nostrLinkStatusAtom } from '@/features/nostr-link/state';
import { useRoomSession } from '../hooks/useRoomSession';

const mocks = vi.hoisted(() => ({
  activeAccount: 'ak_me' as string | undefined,
  unlockRoomSession: vi.fn<(address: string) => Promise<string>>(async () => 'pubkey'),
  fetchNostrLink: vi.fn(),
}));

vi.mock('@/hooks', () => ({
  useAccount: () => ({ activeAccount: mocks.activeAccount }),
}));

vi.mock('@/features/nostr-link/link-flow', () => ({
  fetchNostrLink: (address: string) => mocks.fetchNostrLink(address),
}));

vi.mock('../session/room-session', () => ({
  unlockRoomSession: (address: string) => mocks.unlockRoomSession(address),
  lockRoomSession: vi.fn(),
  subscribeRoomSession: () => () => {},
  roomKeySession: { isUnlocked: false, keys: null },
  roomRevocableIdentity: {},
}));

const Harness = () => {
  const { unlock, error } = useRoomSession();
  const status = useAtomValue(nostrLinkStatusAtom);
  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="error">{error?.message ?? ''}</div>
      <button type="button" data-testid="unlock" onClick={() => { unlock(); }}>unlock</button>
    </div>
  );
};

const renderHarness = () => {
  const store = createStore();
  render(<Provider store={store}><Harness /></Provider>);
  return store;
};

beforeEach(() => {
  mocks.activeAccount = 'ak_me';
  mocks.unlockRoomSession.mockClear();
  mocks.fetchNostrLink.mockReset();
});

describe('useRoomSession — unlock raises the link prompt', () => {
  it('prompts to link when the unlocked account has no registered npub', async () => {
    mocks.fetchNostrLink.mockResolvedValue(null);
    renderHarness();

    fireEvent.click(screen.getByTestId('unlock'));

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('prompt'));
    expect(mocks.fetchNostrLink).toHaveBeenCalledWith('ak_me');
  });

  it('marks the account linked instead of prompting when an npub is registered', async () => {
    mocks.fetchNostrLink.mockResolvedValue('npub1already');
    renderHarness();

    fireEvent.click(screen.getByTestId('unlock'));

    await waitFor(() => expect(screen.getByTestId('status').textContent).toBe('linked'));
  });

  it('does not re-check an account the gate already resolved as linked', async () => {
    mocks.fetchNostrLink.mockResolvedValue(null);
    const store = renderHarness();
    store.set(nostrLinkStatusAtom, 'linked');

    fireEvent.click(screen.getByTestId('unlock'));

    await waitFor(() => expect(mocks.unlockRoomSession).toHaveBeenCalled());
    expect(mocks.fetchNostrLink).not.toHaveBeenCalled();
    expect(screen.getByTestId('status').textContent).toBe('linked');
  });

  it('does not prompt when the unlock itself fails', async () => {
    mocks.unlockRoomSession.mockRejectedValueOnce(new Error('no vault'));
    mocks.fetchNostrLink.mockResolvedValue(null);
    renderHarness();

    fireEvent.click(screen.getByTestId('unlock'));

    await waitFor(() => expect(screen.getByTestId('error').textContent).toBe('no vault'));
    expect(mocks.fetchNostrLink).not.toHaveBeenCalled();
    expect(screen.getByTestId('status').textContent).toBe('idle');
  });

  it('keeps a failed link lookup out of the unlock error', async () => {
    mocks.fetchNostrLink.mockRejectedValue(new Error('link service down'));
    renderHarness();

    fireEvent.click(screen.getByTestId('unlock'));

    await waitFor(() => expect(mocks.fetchNostrLink).toHaveBeenCalled());
    expect(screen.getByTestId('error').textContent).toBe('');
    expect(screen.getByTestId('status').textContent).toBe('idle');
  });
});
