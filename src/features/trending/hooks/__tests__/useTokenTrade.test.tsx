import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';

import { Decimal } from '@/libs/decimal';
import { useTokenTrade } from '../useTokenTrade';

const mockUseTokenTradeStore = vi.fn();
const mockSetupContractInstance = vi.fn();
const mockFetchUserTokenBalance = vi.fn();
const mockGetTokenSymbolName = vi.fn();
const mockGetContractInstances = vi.fn();

vi.mock('../../libs/tokenTradeContract', () => ({
  setupContractInstance: (...args: any[]) => mockSetupContractInstance(...args),
  fetchUserTokenBalance: (...args: any[]) => mockFetchUserTokenBalance(...args),
  getTokenSymbolName: (...args: any[]) => mockGetTokenSymbolName(...args),
  getContractInstances: (...args: any[]) => mockGetContractInstances(...args),
}));

vi.mock('../useTokenTradeStore', () => ({
  useTokenTradeStore: () => mockUseTokenTradeStore(),
}));

vi.mock('../../../../hooks/useAeSdk', () => ({
  useAeSdk: () => ({
    sdk: { id: 'sdk' },
    aeSdk: { _accounts: { current: { ak_wallet: {} } } },
    staticAeSdk: { id: 'static-sdk' },
    activeAccount: 'ak_wallet',
  }),
}));

vi.mock('../../../../config', () => ({
  CONFIG: {
    MIDDLEWARE_URL: 'https://middleware.example',
  },
}));

function createStore(overrides: Record<string, unknown> = {}) {
  return {
    token: undefined,
    userBalance: '0',
    loadingAePrice: false,
    loadingTransaction: false,
    desiredSlippage: 0,
    isBuying: true,
    isAllowSelling: false,
    successTxData: undefined,
    tokenA: undefined,
    tokenB: undefined,
    tokenAFocused: false,
    nextPrice: Decimal.ZERO,
    slippage: 0.5,
    averageTokenPrice: Decimal.ZERO,
    priceImpactDiff: Decimal.ZERO,
    priceImpactPercent: Decimal.ZERO,
    estimatedNextTokenPriceImpactDifferenceFormattedPercentage: '0%',
    spendableAeBalance: Decimal.ZERO,
    isInsufficientBalance: false,
    switchTradeView: vi.fn(),
    resetFormData: vi.fn(),
    updateToken: vi.fn(),
    updateUserBalance: vi.fn(),
    updateTokenA: vi.fn(),
    updateTokenB: vi.fn(),
    updateTokenAFocused: vi.fn(),
    updateNextPrice: vi.fn(),
    updateSuccessTxData: vi.fn(),
    updateLoadingTransaction: vi.fn(),
    updateIsAllowSelling: vi.fn(),
    updateSlippage: vi.fn(),
    ...overrides,
  };
}

describe('useTokenTrade', () => {
  const token = {
    address: 'ct_token',
    sale_address: undefined,
    symbol: 'MOON',
    total_supply: '1000',
    decimals: 18,
  } as any;

  let saleInstance: any;
  let store: ReturnType<typeof createStore>;
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    saleInstance = {
      buy: vi.fn(),
      createSellAllowance: vi.fn(),
      sellWithExistingAllowance: vi.fn(),
    };

    store = createStore();
    mockUseTokenTradeStore.mockReturnValue(store);
    mockGetContractInstances.mockReturnValue({
      tokenSaleInstance: saleInstance,
      bondingCurveInstance: null,
    });
    mockSetupContractInstance.mockResolvedValue({
      tokenSaleInstance: saleInstance,
      bondingCurveInstance: null,
    });
    mockFetchUserTokenBalance.mockResolvedValue('42');
    mockGetTokenSymbolName.mockResolvedValue('PROTO');
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('records successful buy transactions with derived amounts and refreshed balances', async () => {
    store = createStore({
      isBuying: true,
      tokenB: 25,
      slippage: 1,
    });
    mockUseTokenTradeStore.mockReturnValue(store);

    saleInstance.buy.mockResolvedValue({
      decodedEvents: [
        { name: 'Buy', args: ['3000000000000000000'] },
        { name: 'Mint', args: ['ignored', '1000000000000000000'], contract: { address: 'ct_protocol' } },
        { name: 'Mint', args: ['ignored', '25000000000000000000'], contract: { address: 'ct_token' } },
      ],
    });

    const { result } = renderHook(() => useTokenTrade({ token }), { wrapper });

    await act(async () => {
      await result.current.buy();
    });

    expect(saleInstance.buy).toHaveBeenCalledWith(25, undefined, 1);
    expect(mockFetchUserTokenBalance).toHaveBeenCalledWith(saleInstance, token, 'ak_wallet');

    const successArg = store.updateSuccessTxData.mock.calls[0][0];
    expect(successArg.isBuying).toBe(true);
    expect(successArg.symbol).toBe('MOON');
    expect(successArg.protocolSymbol).toBe('PROTO');
    expect(successArg.destAmount.toString()).toBe('25');
    expect(successArg.sourceAmount.toString()).toBe('3');
    expect(successArg.protocolReward.toString()).toBe('1');
    expect(successArg.userBalance.toString()).toBe('42');
  });

  it('creates allowance before selling and stores the resulting sell summary', async () => {
    store = createStore({
      isBuying: false,
      tokenA: 12,
      slippage: 0.75,
    });
    mockUseTokenTradeStore.mockReturnValue(store);

    saleInstance.createSellAllowance.mockResolvedValue('12000000000000000000');
    saleInstance.sellWithExistingAllowance.mockResolvedValue({
      decodedEvents: [
        { name: 'Sell', args: ['7000000000000000000'] },
        { name: 'Burn', args: ['ignored', '12000000000000000000'] },
      ],
    });

    const { result } = renderHook(() => useTokenTrade({ token }), { wrapper });

    await act(async () => {
      await result.current.sell();
    });

    expect(saleInstance.createSellAllowance).toHaveBeenCalledWith('12');
    expect(saleInstance.sellWithExistingAllowance).toHaveBeenCalledWith(
      '12000000000000000000',
      0.75,
    );
    expect(store.updateIsAllowSelling).toHaveBeenNthCalledWith(1, true);
    expect(store.updateIsAllowSelling).toHaveBeenNthCalledWith(2, false);

    const successArg = store.updateSuccessTxData.mock.calls[0][0];
    expect(successArg.isBuying).toBe(false);
    expect(successArg.symbol).toBe('MOON');
    expect(successArg.destAmount.toString()).toBe('12');
    expect(successArg.sourceAmount.toString()).toBe('7');
    expect(successArg.userBalance.toString()).toBe('42');
  });
});
