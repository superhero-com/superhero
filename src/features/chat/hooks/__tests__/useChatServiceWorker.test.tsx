/**
 * The only code in the app that UNREGISTERS a service worker, on an origin that also
 * carries the notifications worker at root scope — so both directions are pinned:
 * taking ours off when chat is dark-shipped, and never touching one that is not ours.
 */
import { createElement, type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

vi.mock('@/utils/trustedTypes', () => ({
  // The real policy needs a browser Trusted Types implementation.
  trustedScriptUrl: (url: string) => url,
}));

const { useChatServiceWorker } = await import('../useChatServiceWorker');

const register = vi.fn(async () => ({}));
const getRegistration = vi.fn(async () => undefined as unknown);
const unregister = vi.fn();

/** A registration whose only filled slot is `slot` — how a worker mid-install is reported. */
const registration = (scriptURL: string, slot: 'installing' | 'waiting' | 'active') => ({
  installing: null, waiting: null, active: null, [slot]: { scriptURL }, unregister,
});

const CHAT_SW = 'https://app.test/chat-offline-sw.js';
const NOTIFICATIONS_SW = 'https://app.test/notifications-sw.js';

function render(path: string, relayCount: number) {
  return renderHook(() => useChatServiceWorker(relayCount), {
    wrapper: ({ children }: { children: ReactNode }) => (
      createElement(MemoryRouter, { initialEntries: [path] }, children)
    ),
  });
}

beforeEach(() => {
  register.mockClear();
  getRegistration.mockClear().mockResolvedValue(undefined);
  unregister.mockClear();
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { register, getRegistration },
  });
});

describe('useChatServiceWorker — who gets a worker', () => {
  it('registers on a chat route, scoped to /chat', () => {
    render('/chat/dm/ak_abc', 1);

    expect(register).toHaveBeenCalledWith('/chat-offline-sw.js', { scope: '/chat' });
  });

  it('leaves a visitor who never opens chat without one', () => {
    render('/trends', 1);

    expect(register).not.toHaveBeenCalled();
  });

  it('does not register a worker on a route that merely starts with the scope string', () => {
    render('/chatter', 1);

    expect(register).not.toHaveBeenCalled();
  });
});

describe('useChatServiceWorker — removal when chat is dark-shipped', () => {
  it('takes our active worker off when no relay is configured', async () => {
    // Nothing else removes it: a worker is not evicted by shipping a build that
    // stops registering it.
    getRegistration.mockResolvedValue(registration(CHAT_SW, 'active'));

    render('/trends', 0);

    await waitFor(() => expect(unregister).toHaveBeenCalled());
    expect(register).not.toHaveBeenCalled();
  });

  it('takes it off even when caught between install and activate', async () => {
    // Reachable by clearing every relay in settings just after a chat route mounts.
    getRegistration.mockResolvedValue(registration(CHAT_SW, 'installing'));

    render('/chat', 0);

    await waitFor(() => expect(unregister).toHaveBeenCalled());
  });

  it('never unregisters the root notifications worker', async () => {
    // Off a chat route that is the registration `getRegistration` resolves, and it
    // is the one that delivers push.
    getRegistration.mockResolvedValue(registration(NOTIFICATIONS_SW, 'active'));

    render('/trends', 0);

    await waitFor(() => expect(getRegistration).toHaveBeenCalled());
    expect(unregister).not.toHaveBeenCalled();
  });
});
