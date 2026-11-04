import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { createStore, Provider as JotaiProvider } from 'jotai';
import {
  MemoryRouter, Route, Routes, useLocation,
} from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { FakeBroadcastChannel } from '@/__tests__/helpers/fakeBroadcastChannel';
import { SuperheroApi } from '@/api/backend';
import {
  TX_QUEUE_ACK_CHANNEL, TX_QUEUE_REQUEST_PREFIX, TX_QUEUE_RESULT_PREFIX, transactionsQueueAtom,
} from '@/atoms/txQueueAtoms';
import { verifyLinkMessageSignature } from '@/utils/signLinkMessage';
import TxQueue from '@/views/TxQueue';

const { VALID_SIGNATURE } = vi.hoisted(() => ({ VALID_SIGNATURE: 'ab'.repeat(64) }));

// aepp-sdk's hashing rejects jsdom's typed arrays, so the curve check is stood in for: what this
// page owns is submitting only what the verifier accepts.
vi.mock('@/utils/signLinkMessage', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/utils/signLinkMessage')>(),
  verifyLinkMessageSignature: vi.fn(
    (_address: string, _message: string, signature: string) => signature === VALID_SIGNATURE,
  ),
}));

/**
 * `/tx-queue/:id` is where the wallet redirects after signing. The page hands the result to the
 * app tab that asked for it, then gets out of the way; when it was opened standalone with
 * nobody waiting, it finishes a stored message-signing request itself.
 */
const ID = 'k3x9q';
const SIGNED_TX = 'tx_+QEKCwH4QrhA8sig+ned/payload==';
const RELAY_ACK_TIMEOUT_MS = 1500;

const advance = (ms: number) => act(async () => {
  await vi.advanceTimersByTimeAsync(ms);
});

const WhereItWent = () => {
  const { pathname, search } = useLocation();
  return <p>{`left for ${pathname}${search}`}</p>;
};

const renderCallback = (search: string) => {
  const store = createStore();
  const queryClient = new QueryClient();
  render(
    <JotaiProvider store={store}>
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/tx-queue/${ID}?${search}`]}>
          <Routes>
            <Route path="/tx-queue/:id" element={<TxQueue />} />
            <Route path="*" element={<WhereItWent />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </JotaiProvider>,
  );
  return { store, queryClient };
};

const storedResult = () => JSON.parse(localStorage.getItem(`${TX_QUEUE_RESULT_PREFIX}${ID}`) ?? 'null');

describe('TxQueue wallet callback page', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeBroadcastChannel.reset();
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
    // jsdom tears the whole window down on close(); a real tab the script did not open stays.
    vi.spyOn(window, 'close').mockImplementation(() => {});
  });

  it.each([
    // Wallets substitute the placeholder verbatim, so the '+' of the signed tx arrives unencoded.
    ['a signed transaction', `transaction=${SIGNED_TX}&status=completed`, { status: 'completed', transaction: SIGNED_TX }],
    ['a completion without a signed transaction', 'transaction={transaction}&status=completed', { status: 'cancelled' }],
    ['a cancellation', 'status=cancelled', { status: 'cancelled' }],
  ])('records %s for the app tab', (_label, search, expected) => {
    const { store } = renderCallback(search);

    expect(storedResult()).toMatchObject(expected);
    expect(store.get(transactionsQueueAtom)[ID]).toMatchObject(expected);
  });

  it.each([
    ['back to the page it came from', '/trends/tokens/HERO?tab=trade', 'left for /trends/tokens/HERO?tab=trade'],
    ['home instead of an off-site returnUrl', 'https://evil.example/drain', 'left for /'],
  ])('leaves %s once the app tab acknowledges its request', async (_label, returnUrl, destination) => {
    renderCallback(`transaction=${SIGNED_TX}&status=completed&returnUrl=${encodeURIComponent(returnUrl)}`);
    const appTab = new FakeBroadcastChannel(TX_QUEUE_ACK_CHANNEL);

    appTab.postMessage({ id: 'another-request', status: 'completed' });
    await advance(0);
    expect(screen.getByText('Processing transaction…')).toBeInTheDocument();

    appTab.postMessage({ id: ID, status: 'completed' });
    await advance(0);
    expect(window.close).toHaveBeenCalled();
    expect(screen.getByText(destination)).toBeInTheDocument();
  });

  it('leaves on its own when no app tab answers and there is nothing to resume', async () => {
    renderCallback(`transaction=${SIGNED_TX}&status=completed`);

    await advance(RELAY_ACK_TIMEOUT_MS - 1);
    expect(screen.getByText('Processing transaction…')).toBeInTheDocument();

    await advance(1);
    expect(screen.getByText('left for /')).toBeInTheDocument();
  });

  describe('with a stored message-signing request nobody acknowledges', () => {
    const ADDRESS = 'ak_2A9VjfQRaqszvjfYL3zsiGXf2XZ51dqhgDq9qdPRGHrjpDNeJo';
    const MESSAGE = `Superhero profile update for ${ADDRESS}, nonce 7`;

    beforeEach(() => {
      localStorage.setItem(`${TX_QUEUE_REQUEST_PREFIX}${ID}`, JSON.stringify({
        type: 'profile-update', address: ADDRESS, payload: { bio: 'gm' }, message: MESSAGE,
      }));
    });

    it('submits it itself when opened standalone and refreshes the profile', async () => {
      const updateProfile = vi.spyOn(SuperheroApi, 'updateProfile').mockResolvedValue(undefined as never);
      const { queryClient } = renderCallback(`signature=${VALID_SIGNATURE}&status=completed`);
      const profileKey = ['SuperheroApi.getProfile', ADDRESS];
      queryClient.setQueryData(profileKey, { bio: 'before' });

      await advance(RELAY_ACK_TIMEOUT_MS);

      expect(verifyLinkMessageSignature).toHaveBeenCalledWith(ADDRESS, MESSAGE, VALID_SIGNATURE);
      expect(updateProfile).toHaveBeenCalledWith(ADDRESS, {
        bio: 'gm', challenge: MESSAGE, signature: VALID_SIGNATURE,
      });
      expect(queryClient.getQueryState(profileKey)?.isInvalidated).toBe(true);
      expect(screen.getByText('Profile updated successfully')).toBeInTheDocument();
      expect(localStorage.getItem(`${TX_QUEUE_REQUEST_PREFIX}${ID}`)).toBeNull();
      expect(storedResult()).toBeNull();
    });

    it('refuses a signature that does not verify for the requesting address', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const updateProfile = vi.spyOn(SuperheroApi, 'updateProfile');
      renderCallback(`signature=${'cd'.repeat(64)}&status=completed`);

      await advance(RELAY_ACK_TIMEOUT_MS);

      expect(updateProfile).not.toHaveBeenCalled();
      expect(screen.getByText('Wallet signature verification failed locally')).toBeInTheDocument();
    });

    it('leaves it to the window that opened it', async () => {
      vi.stubGlobal('opener', {});
      const updateProfile = vi.spyOn(SuperheroApi, 'updateProfile').mockResolvedValue(undefined as never);
      renderCallback(`signature=${VALID_SIGNATURE}&status=completed`);

      await advance(RELAY_ACK_TIMEOUT_MS);

      expect(updateProfile).not.toHaveBeenCalled();
      expect(screen.getByText('left for /')).toBeInTheDocument();
    });
  });
});
