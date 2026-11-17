import { act, renderHook } from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi, type Mock,
} from 'vitest';
import { CONFIG } from '@/config';
import { TxPayloadType } from '@/features/transaction-notification/transaction-notification.context';
import type { LiquidityExecutionParams, RemoveLiquidityExecutionParams } from '../../types/pool';
import { useAddLiquidity } from '../useAddLiquidity';

// Only the chain boundary is faked: the real toAettos/subSlippage run, so the assertions below
// check the exact base-unit amounts that reach the router.
const mocks = vi.hoisted(() => ({
  sdk: { id: 'sdk' },
  factory: { id: 'factory' },
  account: 'ak_provider' as string | undefined,
  router: {} as Record<string, Mock>,
  notify: {} as Record<string, Mock>,
  ensureAllowance: (() => {}) as Mock,
  ensurePairAllowance: (() => {}) as Mock,
  getPairInfo: (() => {}) as Mock,
  getTokenBalance: (() => {}) as Mock,
  addActivity: (() => {}) as Mock,
  track: (() => {}) as Mock,
}));

vi.mock('@/hooks/useAeSdk', () => ({ useAeSdk: () => ({ sdk: mocks.sdk }) }));
vi.mock('@/hooks/useAccount', () => ({ useAccount: () => ({ activeAccount: mocks.account }) }));
vi.mock('@/hooks/useRecentActivities', () => ({
  useRecentActivities: () => ({ addActivity: mocks.addActivity }),
}));
vi.mock('../useLiquidityPreview', () => ({
  useLiquidityPreview: () => ({
    preview: null, pairExists: false, status: 'idle', refetch: vi.fn(),
  }),
}));
vi.mock('@/libs/dex', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/libs/dex')>()),
  initDexContracts: async () => ({ router: mocks.router, factory: mocks.factory }),
  ensureAllowanceForRouter: (...args: unknown[]) => mocks.ensureAllowance(...args),
  ensurePairAllowanceForRouter: (...args: unknown[]) => mocks.ensurePairAllowance(...args),
  getPairInfo: (...args: unknown[]) => mocks.getPairInfo(...args),
  getTokenBalance: (...args: unknown[]) => mocks.getTokenBalance(...args),
}));
vi.mock('@/features/transaction-notification/transaction-notification.context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/transaction-notification/transaction-notification.context')>()),
  useTransactionNotification: () => mocks.notify,
}));
vi.mock('@/lib/journey', () => ({ track: (...args: unknown[]) => mocks.track(...args) }));

const NOW = 1_700_000_000_000;
const DEADLINE = BigInt(NOW + 20 * 60_000);
const ACCOUNT = 'ak_provider';
const MINIMUM_LIQUIDITY = 1000n;
const E18 = 10n ** 18n;
const ADD_FAILED = 'Adding liquidity failed. Check amounts and try again.';
const REMOVE_FAILED = 'Removing liquidity failed. Check amounts and try again.';
const REJECTED = 'Transaction was rejected in your wallet.';

function addParams(overrides: Partial<LiquidityExecutionParams> = {}): LiquidityExecutionParams {
  return {
    tokenA: 'ct_usdc',
    tokenB: 'ct_tkn',
    symbolA: 'USDC',
    symbolB: 'TKN',
    amountA: '100',
    amountB: '25',
    slippagePct: 0.5,
    deadlineMins: 20,
    isAePair: false,
    ...overrides,
  };
}

type RemoveParams = RemoveLiquidityExecutionParams & {
  isFullRemoval?: boolean;
  rawBalance?: string;
};
function removeParams(overrides: Partial<RemoveParams> = {}): RemoveParams {
  return {
    tokenA: 'ct_usdc',
    tokenB: 'ct_tkn',
    tokenASymbol: 'USDC',
    tokenBSymbol: 'TKN',
    liquidity: '0.5',
    liquidityPct: '50',
    slippagePct: 0.5,
    deadlineMins: 20,
    isAePair: false,
    ...overrides,
  };
}

// The form copies the selected tokens' decimals into the hook state before submitting.
function renderWithDecimals(decA: number, decB: number) {
  const view = renderHook(() => useAddLiquidity());
  act(() => view.result.current.setState((prev) => ({ ...prev, decA, decB })));
  return view;
}

async function settle<T>(run: () => Promise<T>) {
  let outcome: { value?: T; error?: Error } = {};
  await act(async () => {
    outcome = await run().then((value) => ({ value }), (error: Error) => ({ error }));
  });
  return outcome;
}

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
  mocks.account = ACCOUNT;
  mocks.router = {
    add_liquidity: vi.fn().mockResolvedValue({ hash: 'th_add' }),
    add_liquidity_ae: vi.fn().mockResolvedValue({ hash: 'th_add_ae' }),
    remove_liquidity: vi.fn().mockResolvedValue({ hash: 'th_remove' }),
    remove_liquidity_ae: vi.fn().mockResolvedValue({ hash: 'th_remove_ae' }),
  };
  mocks.notify = {
    notifySubmitted: vi.fn(),
    notifyPendingTx: vi.fn(),
    notifyConfirmed: vi.fn(),
    notifyError: vi.fn(),
  };
  mocks.ensureAllowance = vi.fn().mockResolvedValue(undefined);
  mocks.ensurePairAllowance = vi.fn().mockResolvedValue(undefined);
  mocks.getPairInfo = vi.fn();
  mocks.getTokenBalance = vi.fn();
  mocks.addActivity = vi.fn();
  mocks.track = vi.fn();
});

describe('executeAddLiquidity', () => {
  it('deposits a token pair in the base units of each token, bounded by slippage', async () => {
    const { result } = renderWithDecimals(6, 18);

    const { value } = await settle(() => result.current.executeAddLiquidity(addParams()));

    expect(value).toBe('th_add');
    expect(mocks.ensureAllowance.mock.calls).toEqual([
      [mocks.sdk, 'ct_usdc', ACCOUNT, 100_000_000n],
      [mocks.sdk, 'ct_tkn', ACCOUNT, 25n * E18],
    ]);
    expect(mocks.router.add_liquidity).toHaveBeenCalledWith(
      'ct_usdc',
      'ct_tkn',
      100_000_000n,
      25n * E18,
      99_500_000n,
      24_875_000_000_000_000_000n,
      ACCOUNT,
      MINIMUM_LIQUIDITY,
      DEADLINE,
      { omitUnknown: true },
    );
    expect(mocks.router.add_liquidity_ae).not.toHaveBeenCalled();
    expect(mocks.ensureAllowance.mock.invocationCallOrder[1])
      .toBeLessThan(mocks.router.add_liquidity.mock.invocationCallOrder[0]);
  });

  it('records the deposit and hands the hash to the notification banner', async () => {
    const { result } = renderWithDecimals(6, 18);

    await settle(() => result.current.executeAddLiquidity(addParams()));

    expect(mocks.addActivity).toHaveBeenCalledWith({
      type: 'add_liquidity',
      hash: 'th_add',
      account: ACCOUNT,
      tokenIn: 'USDC',
      tokenOut: 'TKN',
      amountIn: '100',
      amountOut: '25',
    });
    expect(mocks.notify.notifyPendingTx).toHaveBeenCalledWith({
      type: TxPayloadType.AddLiquidity,
      tokenASymbol: 'USDC',
      tokenBSymbol: 'TKN',
      amountA: '100',
      amountB: '25',
    }, 'th_add');
    expect(mocks.track).toHaveBeenCalledWith('liquidity_added');
    expect(result.current.state.loading).toBe(false);
    expect(result.current.state.error).toBeNull();
  });

  it.each([
    {
      side: 'A', tokenA: 'AE', tokenB: 'ct_tkn', amountA: '2', amountB: '50',
    },
    {
      side: 'B', tokenA: 'ct_tkn', tokenB: 'AE', amountA: '50', amountB: '2',
    },
  ])('sends AE as the call value when AE is token $side', async (pair) => {
    const { result } = renderWithDecimals(18, 18);

    const { value } = await settle(() => result.current.executeAddLiquidity(
      addParams({ ...pair, isAePair: true }),
    ));

    expect(value).toBe('th_add_ae');
    expect(mocks.ensureAllowance.mock.calls).toEqual([[mocks.sdk, 'ct_tkn', ACCOUNT, 50n * E18]]);
    expect(mocks.router.add_liquidity_ae).toHaveBeenCalledWith(
      'ct_tkn',
      50n * E18,
      49_750_000_000_000_000_000n,
      1_990_000_000_000_000_000n,
      ACCOUNT,
      MINIMUM_LIQUIDITY,
      DEADLINE,
      { amount: '2000000000000000000', omitUnknown: true },
    );
    expect(mocks.router.add_liquidity).not.toHaveBeenCalled();
  });

  it.each([
    ['a 100% slippage', { slippagePct: 100 }],
    ['a negative slippage', { slippagePct: -1 }],
    ['a zero amount', { amountA: '0' }],
  ])('signs nothing for %s', async (_name, overrides) => {
    const { result } = renderWithDecimals(6, 18);

    const { error } = await settle(() => result.current.executeAddLiquidity(addParams(overrides)));

    expect(error).toBeInstanceOf(Error);
    expect(mocks.notify.notifyError).toHaveBeenCalledWith(error?.message);
    expect(result.current.state.error).toBe(error?.message);
    expect(result.current.state.loading).toBe(false);
    expect(mocks.ensureAllowance).not.toHaveBeenCalled();
    expect(mocks.router.add_liquidity).not.toHaveBeenCalled();
    expect(mocks.router.add_liquidity_ae).not.toHaveBeenCalled();
  });

  it('refuses to start without a connected wallet', async () => {
    mocks.account = undefined;
    const { result } = renderWithDecimals(6, 18);

    const { error } = await settle(() => result.current.executeAddLiquidity(addParams()));

    expect(error?.message).toBe('Wallet not connected');
    expect(mocks.notify.notifySubmitted).not.toHaveBeenCalled();
    expect(mocks.ensureAllowance).not.toHaveBeenCalled();
  });

  it('records nothing when the wallet rejects the deposit', async () => {
    mocks.router.add_liquidity.mockRejectedValue(new Error('Rejected by user'));
    const { result } = renderWithDecimals(6, 18);

    const { error } = await settle(() => result.current.executeAddLiquidity(addParams()));

    expect(error?.message).toBe(REJECTED);
    expect(mocks.notify.notifyError).toHaveBeenCalledWith(REJECTED);
    expect(result.current.state.error).toBe(REJECTED);
    expect(mocks.addActivity).not.toHaveBeenCalled();
    expect(mocks.notify.notifyPendingTx).not.toHaveBeenCalled();
    expect(mocks.track).not.toHaveBeenCalled();
  });

  it('stops at the first rejected approval', async () => {
    mocks.ensureAllowance.mockRejectedValue(new Error('Rejected by user'));
    const { result } = renderWithDecimals(6, 18);

    const { error } = await settle(() => result.current.executeAddLiquidity(addParams()));

    expect(error?.message).toBe(REJECTED);
    expect(mocks.ensureAllowance).toHaveBeenCalledTimes(1);
    expect(mocks.router.add_liquidity).not.toHaveBeenCalled();
    expect(mocks.addActivity).not.toHaveBeenCalled();
  });

  it('treats a result without a transaction hash as a failure', async () => {
    mocks.router.add_liquidity.mockResolvedValue({});
    const { result } = renderWithDecimals(6, 18);

    const { error } = await settle(() => result.current.executeAddLiquidity(addParams()));

    expect(error?.message).toBe(ADD_FAILED);
    expect(mocks.addActivity).not.toHaveBeenCalled();
  });
});

describe('executeRemoveLiquidity', () => {
  // 1000 USDC (6 decimals) and 4000 TKN against 2 LP tokens.
  const tokenPool = {
    pairAddress: 'ct_pair', reserveA: 1_000_000_000n, reserveB: 4000n * E18, totalSupply: 2n * E18,
  };
  // Looked up as (token, WAE), so reserveA is always the token side.
  const aePool = {
    pairAddress: 'ct_ae_pair', reserveA: 4000n * E18, reserveB: 100n * E18, totalSupply: 2n * E18,
  };
  // A rounded amount, so the raw balance is the only source of the exact figure.
  const fullRemoval = {
    liquidity: '1.2346', liquidityPct: '100', isFullRemoval: true, rawBalance: '1234567890123456789',
  };

  it('withdraws a share of a token pair with minimums taken from the reserves', async () => {
    mocks.getPairInfo.mockResolvedValue(tokenPool);
    const { result } = renderHook(() => useAddLiquidity());

    const { value } = await settle(() => result.current.executeRemoveLiquidity(removeParams()));

    expect(value).toBe('th_remove');
    expect(mocks.getPairInfo).toHaveBeenCalledWith(mocks.sdk, mocks.factory, 'ct_usdc', 'ct_tkn');
    expect(mocks.ensurePairAllowance).toHaveBeenCalledWith(
      mocks.sdk,
      'ct_pair',
      ACCOUNT,
      E18 / 2n,
    );
    // 0.5 of 2 LP is a quarter of each reserve: 250 USDC and 1000 TKN, less 0.5%.
    expect(mocks.router.remove_liquidity).toHaveBeenCalledWith(
      'ct_usdc',
      'ct_tkn',
      E18 / 2n,
      248_750_000n,
      995n * E18,
      ACCOUNT,
      DEADLINE,
      { omitUnknown: true },
    );
    expect(mocks.ensurePairAllowance.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.router.remove_liquidity.mock.invocationCallOrder[0]);
    expect(mocks.getTokenBalance).not.toHaveBeenCalled();
    expect(mocks.addActivity).toHaveBeenCalledWith({
      type: 'remove_liquidity',
      hash: 'th_remove',
      account: ACCOUNT,
      tokenIn: 'USDC',
      tokenOut: 'TKN',
      amountIn: '0.5',
    });
    expect(mocks.notify.notifyPendingTx).toHaveBeenCalledWith({
      type: TxPayloadType.RemoveLiquidity,
      tokenASymbol: 'USDC',
      tokenBSymbol: 'TKN',
      liquidityPct: '50',
      lpAmount: '0.5',
    }, 'th_remove');
  });

  it.each([
    { side: 'A', tokenA: CONFIG.DEX_WAE, tokenB: 'ct_tkn' },
    { side: 'B', tokenA: 'ct_tkn', tokenB: CONFIG.DEX_WAE },
  ])('withdraws AE through remove_liquidity_ae when WAE is token $side', async (pair) => {
    mocks.getPairInfo.mockResolvedValue(aePool);
    const { result } = renderHook(() => useAddLiquidity());

    const { value } = await settle(() => result.current.executeRemoveLiquidity(
      removeParams({ ...pair, isAePair: true }),
    ));

    expect(value).toBe('th_remove_ae');
    expect(mocks.getPairInfo).toHaveBeenCalledWith(
      mocks.sdk,
      mocks.factory,
      'ct_tkn',
      CONFIG.DEX_WAE,
    );
    expect(mocks.ensurePairAllowance).toHaveBeenCalledWith(mocks.sdk, 'ct_ae_pair', ACCOUNT, E18 / 2n);
    expect(mocks.router.remove_liquidity_ae).toHaveBeenCalledWith(
      'ct_tkn',
      E18 / 2n,
      995n * E18,
      24_875_000_000_000_000_000n,
      ACCOUNT,
      DEADLINE,
      { omitUnknown: true },
    );
    expect(mocks.router.remove_liquidity).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'the live on-chain balance when it has one',
      onChain: 1_300_000_000_000_000_000n,
      burned: 1_300_000_000_000_000_000n,
      minimums: [646_750_000n, 2587n * E18],
    },
    {
      name: 'the exact indexed balance when the chain reports none',
      onChain: 0n,
      burned: 1_234_567_890_123_456_789n,
      minimums: [614_197_526n, 2_456_790_101_345_679_010_110n],
    },
  ])('burns $name on a full removal', async ({ onChain, burned, minimums }) => {
    mocks.getPairInfo.mockResolvedValue(tokenPool);
    mocks.getTokenBalance.mockResolvedValue(onChain);
    const { result } = renderHook(() => useAddLiquidity());

    await settle(() => result.current.executeRemoveLiquidity(removeParams(fullRemoval)));

    expect(mocks.getTokenBalance).toHaveBeenCalledWith(mocks.sdk, 'ct_pair', ACCOUNT);
    expect(mocks.ensurePairAllowance).toHaveBeenCalledWith(mocks.sdk, 'ct_pair', ACCOUNT, burned);
    expect(mocks.router.remove_liquidity.mock.calls[0].slice(2, 5)).toEqual([burned, ...minimums]);
  });

  it('burns the live on-chain balance on a full AE-pair removal', async () => {
    const onChain = 1_300_000_000_000_000_000n;
    mocks.getPairInfo.mockResolvedValue(aePool);
    mocks.getTokenBalance.mockResolvedValue(onChain);
    const { result } = renderHook(() => useAddLiquidity());

    await settle(() => result.current.executeRemoveLiquidity(removeParams({
      ...fullRemoval, tokenA: CONFIG.DEX_WAE, tokenB: 'ct_tkn', isAePair: true,
    })));

    expect(mocks.getTokenBalance).toHaveBeenCalledWith(mocks.sdk, 'ct_ae_pair', ACCOUNT);
    expect(mocks.ensurePairAllowance)
      .toHaveBeenCalledWith(mocks.sdk, 'ct_ae_pair', ACCOUNT, onChain);
    expect(mocks.router.remove_liquidity_ae.mock.calls[0].slice(1, 4))
      .toEqual([onChain, 2587n * E18, 64_675_000_000_000_000_000n]);
  });

  it.each([
    ['the pair cannot be read', null, {}],
    ['the pair has no supply', { ...tokenPool, totalSupply: null }, {}],
    ['the amount is zero', tokenPool, { liquidity: '0' }],
    ['the slippage is 100%', tokenPool, { slippagePct: 100 }],
  ])('signs nothing when %s', async (_name, pool, overrides) => {
    mocks.getPairInfo.mockResolvedValue(pool);
    const { result } = renderHook(() => useAddLiquidity());

    const { error } = await settle(() => result.current.executeRemoveLiquidity(
      removeParams(overrides),
    ));

    expect(error?.message).toBe(REMOVE_FAILED);
    expect(mocks.notify.notifyError).toHaveBeenCalledWith(REMOVE_FAILED);
    expect(result.current.state.loading).toBe(false);
    expect(mocks.ensurePairAllowance).not.toHaveBeenCalled();
    expect(mocks.router.remove_liquidity).not.toHaveBeenCalled();
    expect(mocks.router.remove_liquidity_ae).not.toHaveBeenCalled();
  });

  it('records nothing when the wallet rejects the withdrawal', async () => {
    mocks.getPairInfo.mockResolvedValue(tokenPool);
    mocks.router.remove_liquidity.mockRejectedValue(new Error('Rejected by user'));
    const { result } = renderHook(() => useAddLiquidity());

    const { error } = await settle(() => result.current.executeRemoveLiquidity(removeParams()));

    expect(error?.message).toBe(REJECTED);
    expect(mocks.addActivity).not.toHaveBeenCalled();
    expect(mocks.notify.notifyPendingTx).not.toHaveBeenCalled();
  });
});
