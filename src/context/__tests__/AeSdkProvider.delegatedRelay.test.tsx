import type { Encoded } from '@aeternity/aepp-sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act, fireEvent, render, screen,
} from '@testing-library/react';
import { createStore, Provider as JotaiProvider } from 'jotai';
import { useContext } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { FakeBroadcastChannel, listenOn } from '@/__tests__/helpers/fakeBroadcastChannel';
import {
  TX_QUEUE_ACK_CHANNEL, TX_QUEUE_RESULT_PREFIX, transactionsQueueAtom,
} from '@/atoms/txQueueAtoms';
import ModalProvider from '@/components/ModalProvider';
import TransactionConfirmModal from '@/components/modals/TransactionConfirmModal';
import { AeSdkContext, AeSdkProvider } from '@/context/AeSdkProvider';
import { CURRENT_NETWORK } from '@/utils/constants';
import TxQueue from '@/views/TxQueue';

/**
 * An address this device holds no key for signs through the delegated relay: the app opens the
 * wallet with a `/tx-queue/:id` callback, the wallet redirects there, and that page hands the
 * result back to the waiting app tab. This drives the whole round trip with the real provider,
 * confirm modal and callback page; only the network-facing SDK objects and the browser windows
 * are stood in for.
 */
vi.mock('@/libs/WebSocketClient', () => ({
  default: { connect: vi.fn(), disconnect: vi.fn() },
}));

vi.mock('@/features/wallet/components/WalletSignPrompt', () => ({ default: () => null }));

vi.mock('@aeternity/aepp-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@aeternity/aepp-sdk')>();
  class OfflineSdk {
    accounts: Record<string, unknown> = {};

    // eslint-disable-next-line class-methods-use-this
    getCurrentGeneration = () => new Promise(() => {});

    addAccount(account: { address: string }) {
      this.accounts[account.address] = account;
    }
  }
  return { ...actual, AeSdk: OfflineSdk, AeSdkAepp: OfflineSdk };
});

const ADDRESS = 'ak_2swhLkgBPeeADxVTAVCJnZLY5NZtCFiM93JxsEaMuC59euuFRQ';
const UNSIGNED_TX = 'tx_+FgMAaEBunsigned' as Encoded.Transaction;
const SIGNED_TX = 'tx_+QEKCwH4QrhA8sig+ned/payload==';
const SIGNATURE = 'ab'.repeat(64);
const POLL_MS = 500;
const SIGNING_TIMEOUT_MS = 5 * 60 * 1000;

type Outcome<T> = { status: 'pending' | 'fulfilled' | 'rejected'; value?: T; reason?: string };

/** Tracks a promise without leaving its rejection unhandled while the test drives the clock. */
const watch = <T, >(promise: Promise<T>): Outcome<T> => {
  const outcome: Outcome<T> = { status: 'pending' };
  promise.then(
    (value) => Object.assign(outcome, { status: 'fulfilled', value }),
    (error: Error) => Object.assign(outcome, { status: 'rejected', reason: error.message }),
  );
  return outcome;
};

const advance = (ms: number) => act(async () => {
  await vi.advanceTimersByTimeAsync(ms);
});

let appSdk: NonNullable<React.ContextType<typeof AeSdkContext>>;
const CaptureSdk = () => {
  appSdk = useContext(AeSdkContext);
  return null;
};

const renderAppTab = () => {
  const store = createStore();
  render(
    <JotaiProvider store={store}>
      <AeSdkProvider>
        <CaptureSdk />
        <ModalProvider registry={{ 'transaction-confirm': TransactionConfirmModal }} />
      </AeSdkProvider>
    </JotaiProvider>,
  );
  return store;
};

type DelegatedAccount = { signTransaction: (tx: Encoded.Transaction) => Promise<string> };

/** Installs ADDRESS as a deep-link wallet connect does; returns the account it signs with. */
const connectDeepLinkWallet = async (): Promise<DelegatedAccount> => {
  await act(async () => {
    await appSdk.initSdk();
  });
  await act(async () => {
    const added = appSdk.addStaticAccount(ADDRESS);
    await vi.advanceTimersByTimeAsync(100);
    await added;
  });
  return (appSdk.staticAeSdk as unknown as { accounts: Record<string, DelegatedAccount> })
    .accounts[ADDRESS];
};

/** The wallet page the app opened, carrying the callbacks the wallet redirects to. */
const openedWalletPage = () => new URL(String(vi.mocked(window.open).mock.calls[0][0]));

const requestIdOf = (callbackUrl: string) => new URL(callbackUrl).pathname.split('/').pop();

/** Lands on a wallet callback in a tab of its own, which shares only localStorage with the app. */
const renderWalletCallback = (callbackUrl: string) => {
  const { pathname, search } = new URL(callbackUrl);
  render(
    <JotaiProvider store={createStore()}>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={[`${pathname}${search}`]}>
          <Routes>
            <Route path="/tx-queue/:id" element={<TxQueue />} />
            <Route path="/" element={<p>app home</p>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </JotaiProvider>,
  );
};

describe('AeSdkProvider delegated signing relay', () => {
  let popup: { close: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.useFakeTimers();
    FakeBroadcastChannel.reset();
    vi.stubGlobal('BroadcastChannel', FakeBroadcastChannel);
    popup = { close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window);
    // jsdom tears the whole window down on close(); a real tab the script did not open stays.
    vi.spyOn(window, 'close').mockImplementation(() => {});
  });

  describe('signTransaction', () => {
    const startSigning = async () => {
      const store = renderAppTab();
      const account = await connectDeepLinkWallet();
      let signing!: Outcome<string>;
      act(() => {
        signing = watch(account.signTransaction(UNSIGNED_TX));
      });
      return { store, signing };
    };

    it('hands the transaction to the wallet and resolves with the one it signed', async () => {
      const { store, signing } = await startSigning();
      const acks = listenOn(TX_QUEUE_ACK_CHANNEL);

      fireEvent.click(screen.getByRole('button', { name: 'Confirm in Wallet' }));
      const walletPage = openedWalletPage();
      expect(walletPage.pathname).toBe('/sign-transaction');
      expect(walletPage.searchParams.get('transaction')).toBe(UNSIGNED_TX);
      expect(walletPage.searchParams.get('networkId')).toBe(CURRENT_NETWORK.networkId);

      // Wallets substitute the placeholder verbatim, so the '+' of the signed tx arrives unencoded.
      const successUrl = walletPage.searchParams.get('x-success')!;
      const id = requestIdOf(successUrl);
      renderWalletCallback(successUrl.replace('{transaction}', SIGNED_TX));
      await advance(POLL_MS);

      expect(signing).toEqual({ status: 'fulfilled', value: SIGNED_TX });
      expect(acks).toEqual([{ id, status: 'completed' }]);
      expect(popup.close).toHaveBeenCalled();
      expect(store.get(transactionsQueueAtom)).toEqual({});
      expect(localStorage.getItem(`${TX_QUEUE_RESULT_PREFIX}${id}`)).toBeNull();
      // The acknowledgement lets the callback page leave without waiting out its fallback delay.
      expect(screen.getByText('app home')).toBeInTheDocument();
    });

    it('rejects when the user cancels in the wallet', async () => {
      const { store, signing } = await startSigning();
      const acks = listenOn(TX_QUEUE_ACK_CHANNEL);

      fireEvent.click(screen.getByRole('button', { name: 'Confirm in Wallet' }));
      const cancelUrl = openedWalletPage().searchParams.get('x-cancel')!;
      renderWalletCallback(cancelUrl);
      await advance(POLL_MS);

      expect(signing).toEqual({ status: 'rejected', reason: 'Transaction cancelled' });
      expect(acks).toEqual([{ id: requestIdOf(cancelUrl), status: 'cancelled' }]);
      expect(store.get(transactionsQueueAtom)).toEqual({});
    });

    it('treats a completed callback that carries no signed transaction as a cancellation', async () => {
      const { signing } = await startSigning();

      fireEvent.click(screen.getByRole('button', { name: 'Confirm in Wallet' }));
      renderWalletCallback(openedWalletPage().searchParams.get('x-success')!);
      await advance(POLL_MS);

      expect(signing).toEqual({ status: 'rejected', reason: 'Transaction cancelled' });
    });

    it('rejects without opening the wallet when the confirm modal is cancelled', async () => {
      const { store, signing } = await startSigning();

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      await advance(0);

      expect(signing).toEqual({ status: 'rejected', reason: 'Transaction cancelled' });
      expect(window.open).not.toHaveBeenCalled();
      expect(store.get(transactionsQueueAtom)).toEqual({});
    });

    it('gives up and closes the wallet popup after five minutes without an answer', async () => {
      const { signing } = await startSigning();

      fireEvent.click(screen.getByRole('button', { name: 'Confirm in Wallet' }));
      await advance(SIGNING_TIMEOUT_MS - 1);
      expect(signing.status).toBe('pending');

      await advance(1);
      expect(signing).toEqual({ status: 'rejected', reason: 'Transaction polling timeout' });
      expect(popup.close).toHaveBeenCalled();
    });
  });

  describe('signMessage', () => {
    it('falls back to the wallet and resolves with the signature it returns', async () => {
      const store = renderAppTab();
      await connectDeepLinkWallet();
      const acks = listenOn(TX_QUEUE_ACK_CHANNEL);
      let signing!: Outcome<string>;
      act(() => {
        signing = watch(appSdk.signMessage('Link my X account'));
      });

      const walletPage = openedWalletPage();
      expect(walletPage.pathname).toBe('/sign-message');
      expect(walletPage.searchParams.get('message')).toBe('Link my X account');

      const successUrl = walletPage.searchParams.get('x-success')!;
      renderWalletCallback(successUrl.replace('{signature}', SIGNATURE));
      await advance(POLL_MS);

      expect(signing).toEqual({ status: 'fulfilled', value: SIGNATURE });
      expect(acks).toEqual([{ id: requestIdOf(successUrl), status: 'completed' }]);
      expect(popup.close).toHaveBeenCalled();
      expect(store.get(transactionsQueueAtom)).toEqual({});
    });
  });
});
