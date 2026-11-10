import type { ContextType } from 'react';
import BigNumber from 'bignumber.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent, render, screen, waitFor,
} from '@testing-library/react';
import { Provider as JotaiProvider, createStore } from 'jotai';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import { activeAccountAtom } from '@/atoms/accountAtoms';
import { openedModalsAtom } from '@/atoms/modalAtoms';
import { CONFIG } from '@/config';
import { AeSdkContext } from '@/context/AeSdkProvider';
import {
  TransactionNotificationBanner, TransactionNotificationProvider,
} from '@/features/transaction-notification';
import { Decimal } from '@/libs/decimal';
import { buyPrice } from '@/__tests__/helpers/bondingCurveContract';
import { createFakeTokenSaleChain, type FakeTokenSaleChain } from '@/__tests__/helpers/fakeTokenSaleChain';
import TokenTradeCard from '../TokenTradeCard';

const sdkBoundary = vi.hoisted(() => ({ chain: undefined as FakeTokenSaleChain | undefined }));

vi.mock('bctsl-sdk', async (importOriginal) => ({
  ...(await importOriginal<typeof import('bctsl-sdk')>()),
  initAffiliationTokenGatingTokenSale: async (sdk: FakeTokenSaleChain['sdk']) => sdkBoundary.chain!.saleFor(sdk),
}));
// Finding and connecting a wallet is its own feature; the card only asks whether it is underway.
vi.mock('@/hooks/useWalletConnect', () => ({ useWalletConnect: () => ({ connectingWallet: false }) }));

const ACCOUNT = 'ak_2a1j2Mk9YSmC1gioUq4PWRm3bsv887MbuRVwyv4KaUGoR1eiKi';
const SALE = 'ct_2PdKavD7m9TUDmZnBhMqVhKuwMT7xB6A6ezmnGaChFrnUF39CF';
const TOKEN = 'ct_YZJrj8QeW6LkeviP4kZBQ6n7UKnHEht1D2U3xkQRzMYLN5bsb';

/** AE or tokens as aettos. */
const aettos = (amount: number | string) => BigInt(new BigNumber(amount).shiftedBy(18).toFixed(0));
const amountOf = (value: bigint) => new BigNumber(value.toString()).shiftedBy(-18).toNumber();
const SUPPLY = aettos(5_000_000);

// The card shows the AE side of a quote cut to three significant decimals, so what
// settles is the shown amount plus less than 0.001 AE.
function expectSettledAsShown(settled: bigint, shown: string) {
  const gap = settled - aettos(shown);
  expect(gap >= 0n && gap < aettos(0.001), `${amountOf(settled)} AE settled, ${shown} AE shown`).toBe(true);
}

function market({ ae = aettos(100), tokens = 0n } = {}) {
  const chain = createFakeTokenSaleChain({
    account: ACCOUNT, token: TOKEN, sale: SALE, supply: SUPPLY, ae, tokens,
  });
  sdkBoundary.chain = chain;
  return chain;
}

function openTradeCard(chain: FakeTokenSaleChain, { signedIn = true } = {}) {
  const store = createStore();
  if (signedIn) store.set(activeAccountAtom, chain.account);
  const sdk = signedIn ? chain.sdk : { ...chain.sdk, _accounts: { current: {} } };
  const sdkContext = {
    aeSdk: sdk,
    staticAeSdk: sdk,
    sdkInitialized: true,
    activeAccount: signedIn ? chain.account : '',
    addStaticAccount: () => {},
  } as unknown as ContextType<typeof AeSdkContext>;
  const unitPrice = amountOf(buyPrice(chain.supply, aettos(1)));
  const token = {
    address: TOKEN,
    sale_address: SALE,
    name: 'TEST',
    symbol: 'TEST',
    decimals: 18,
    total_supply: chain.supply.toString(),
    price: String(unitPrice),
    sell_price: String(unitPrice * 0.995),
  } as unknown as TokenDto;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <JotaiProvider store={store}>
        <AeSdkContext.Provider value={sdkContext}>
          <TransactionNotificationProvider>
            <TransactionNotificationBanner />
            <TokenTradeCard token={token} />
          </TransactionNotificationProvider>
        </AeSdkContext.Provider>
      </JotaiProvider>
    </QueryClientProvider>,
  );
  return store;
}

const payField = () => screen.getByRole('textbox', { name: 'You pay' });
const receiveField = () => screen.getByRole('textbox', { name: 'You receive Estimated' });

function enter(field: HTMLElement, value: string) {
  fireEvent.focus(field);
  fireEvent.change(field, { target: { value } });
}

/** The amount the card quotes in `field` once the sale is reachable. */
async function quoteIn(field: () => HTMLElement): Promise<string> {
  await waitFor(() => expect(field()).not.toHaveValue(''));
  return (field() as HTMLInputElement).value;
}

const confirmed = () => screen.findByText('Transaction confirmed');

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (String(url).startsWith(`${CONFIG.MIDDLEWARE_URL}/v2/aex9/account-balances/`)) {
      return Response.json({
        data: [{
          contract_id: CONFIG.DEX_WAE, amount: '0', decimals: 18, name: 'Wrapped AE', symbol: 'WAE',
        }],
        next: null,
      });
    }
    if (String(url).includes('/api/accounts/chain-names')) return Response.json({});
    return Response.json({}, { status: 404 });
  }));
});

describe('trading a token from its trade card', () => {
  it('buys what the AE typed pays for, fee included, and never charges more', async () => {
    const chain = market();
    openTradeCard(chain);

    enter(payField(), '10');
    const tokens = await quoteIn(receiveField);
    fireEvent.click(screen.getByRole('button', { name: 'Buy #TEST' }));
    await confirmed();

    const spent = aettos(100) - chain.ae;
    expect(chain.tokens).toBe(aettos(tokens));
    expect(spent <= aettos(10)).toBe(true);
    expect(spent >= aettos(9.9999)).toBe(true);
  });

  it('charges what it quoted for a number of tokens', async () => {
    const chain = market();
    openTradeCard(chain);

    enter(receiveField(), '100000');
    const cost = await quoteIn(payField);
    fireEvent.click(screen.getByRole('button', { name: 'Buy #TEST' }));
    await confirmed();

    expect(chain.tokens).toBe(aettos(100000));
    expectSettledAsShown(aettos(100) - chain.ae, cost);
    expect(screen.getByText(`-${Decimal.from(cost).prettify()} AE`)).toBeInTheDocument();
  });

  it('pays out what it quoted for selling a number of tokens, after an allowance', async () => {
    const chain = market({ tokens: aettos(2_000_000) });
    openTradeCard(chain);
    fireEvent.click(screen.getByRole('button', { name: 'Sell' }));

    enter(payField(), '100000');
    const proceeds = await quoteIn(receiveField);
    fireEvent.click(screen.getByRole('button', { name: 'Sell #TEST' }));
    await confirmed();

    expect(chain.signed).toEqual(['create_allowance', 'sell']);
    expect(chain.tokens).toBe(aettos(1_900_000));
    expectSettledAsShown(chain.ae - aettos(100), proceeds);
    expect(screen.getByText(`+${Decimal.from(proceeds).prettify()} AE`)).toBeInTheDocument();
  });

  it('asked for an AE amount, sells enough tokens to receive at least that', async () => {
    const chain = market({ tokens: aettos(2_000_000) });
    openTradeCard(chain);
    fireEvent.click(screen.getByRole('button', { name: 'Sell' }));

    enter(receiveField(), '5');
    const tokens = await quoteIn(payField);
    fireEvent.click(screen.getByRole('button', { name: 'Sell #TEST' }));
    await confirmed();

    const received = chain.ae - aettos(100);
    expect(aettos(2_000_000) - chain.tokens).toBe(aettos(tokens));
    expect(received >= aettos(5)).toBe(true);
    expect(received <= aettos(5.0001)).toBe(true);
  });

  it('shows each step of a sell while the wallet is open', async () => {
    const chain = market({ tokens: aettos(2_000_000) });
    openTradeCard(chain);
    fireEvent.click(screen.getByRole('button', { name: 'Sell' }));
    enter(payField(), '1000');
    await quoteIn(receiveField);

    const allowance = chain.holdNextSignature();
    fireEvent.click(screen.getByRole('button', { name: 'Sell #TEST' }));
    await allowance.requested;
    await screen.findByText('Approve token spending');
    expect(screen.getByRole('button', { name: /Confirm in your wallet.*1\/2/ })).toBeDisabled();
    expect(payField()).toBeDisabled();

    const sale = chain.holdNextSignature();
    allowance.release();
    await sale.requested;
    await waitFor(() => expect(screen.getByRole('button', { name: /Confirm in your wallet.*2\/2/ })).toBeDisabled());

    sale.release();
    await confirmed();
    expect(screen.getByRole('button', { name: 'Enter an amount' })).toBeDisabled();
  });

  it('keeps a slippage reserve, so a Max buy never needs more than the balance', async () => {
    const chain = market({ ae: aettos(5) });
    openTradeCard(chain);

    enter(payField(), '10');
    await quoteIn(receiveField);
    expect(screen.getByRole('button', { name: 'Insufficient available balance' })).toBeDisabled();

    fireEvent.click(await screen.findByRole('button', { name: 'Max' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Buy #TEST' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: 'Buy #TEST' }));
    await confirmed();

    // The reserve is all Max holds back.
    const spent = aettos(5) - chain.ae;
    expect(spent > aettos(4.5)).toBe(true);
  });

  it('refreshes the token balance once a buy settles', async () => {
    const chain = market();
    openTradeCard(chain);

    enter(receiveField(), '250000');
    await quoteIn(payField);
    fireEvent.click(screen.getByRole('button', { name: 'Buy #TEST' }));
    await confirmed();
    fireEvent.click(screen.getByRole('button', { name: 'Sell' }));

    expect(await screen.findByText(`${Decimal.from(250000).prettify()} #TEST`)).toBeInTheDocument();
  });

  it('leaves the market untouched when the wallet declines, and the form usable', async () => {
    const chain = market();
    chain.rejectSignatures('Rejected by user');
    openTradeCard(chain);

    enter(payField(), '10');
    await quoteIn(receiveField);
    fireEvent.click(screen.getByRole('button', { name: 'Buy #TEST' }));

    expect(await screen.findByText('Transaction failed')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Rejected by user');
    expect([chain.ae, chain.tokens, chain.supply]).toEqual([aettos(100), 0n, SUPPLY]);
    await waitFor(() => expect(payField()).toBeEnabled());
    expect(payField()).toHaveValue('');
  });

  describe('when other trades land while the wallet is open', () => {
    it('reverts a buy the market moved past the allowed slippage', async () => {
      const chain = market();
      openTradeCard(chain);
      enter(payField(), '10');
      await quoteIn(receiveField);

      const signature = chain.holdNextSignature();
      fireEvent.click(screen.getByRole('button', { name: 'Buy #TEST' }));
      await signature.requested;
      chain.othersTrade(aettos(2_000_000));
      signature.release();

      expect(await screen.findByText('Transaction failed')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent('AE_AMOUNT_NOT_SUFFICIENT');
      expect([chain.ae, chain.tokens]).toEqual([aettos(100), 0n]);
    });

    it('lets a buy through within the allowed slippage, at the moved price', async () => {
      const chain = market();
      openTradeCard(chain);
      enter(payField(), '10');
      const tokens = await quoteIn(receiveField);

      const signature = chain.holdNextSignature();
      fireEvent.click(screen.getByRole('button', { name: 'Buy #TEST' }));
      await signature.requested;
      chain.othersTrade(aettos(1000));
      signature.release();
      await confirmed();

      const spent = aettos(100) - chain.ae;
      expect(chain.tokens).toBe(aettos(tokens));
      expect(spent > aettos(10) && spent <= aettos(10.1)).toBe(true);
    });
  });

  it('asks a visitor to connect a wallet to trade', async () => {
    const chain = market();
    const store = openTradeCard(chain, { signedIn: false });

    enter(payField(), '10');
    fireEvent.click(screen.getByRole('button', { name: 'Connect wallet' }));

    expect(store.get(openedModalsAtom)).toEqual([expect.objectContaining({ name: 'connect-wallet' })]);
    expect(chain.signed).toEqual([]);
  });
});
