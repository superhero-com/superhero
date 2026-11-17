import { act, renderHook, waitFor } from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi, type Mock,
} from 'vitest';
import { CONFIG } from '@/config';
import { TxPayloadType } from '@/features/transaction-notification/transaction-notification.context';
import type { SwapExecutionParams } from '../../types/dex';
import { useSwapExecution } from '../useSwapExecution';

// Only the chain boundary is faked: the real toAettos/subSlippage/addSlippage run, so the
// assertions below check the exact base-unit amounts that reach the router.
const mocks = vi.hoisted(() => ({
  sdk: { id: 'sdk' },
  account: 'ak_trader' as string | undefined,
  router: {} as Record<string, Mock>,
  wae: {} as Record<string, Mock>,
  notify: {} as Record<string, Mock>,
  ensureAllowance: (() => {}) as Mock,
  getAllowance: (() => {}) as Mock,
  initContract: (() => {}) as Mock,
  addActivity: (() => {}) as Mock,
  track: (() => {}) as Mock,
}));

vi.mock('@/hooks', () => ({
  useAeSdk: () => ({ sdk: mocks.sdk, activeAccount: mocks.account }),
  useRecentActivities: () => ({ addActivity: mocks.addActivity }),
}));
vi.mock('@/libs/dex', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/libs/dex')>()),
  initDexContracts: async () => ({ router: mocks.router }),
  ensureAllowanceForRouter: (...args: unknown[]) => mocks.ensureAllowance(...args),
  getRouterTokenAllowance: (...args: unknown[]) => mocks.getAllowance(...args),
}));
vi.mock('@/libs/initializeContractTyped', () => ({
  initializeContractTyped: async (...args: unknown[]) => {
    mocks.initContract(...args);
    return mocks.wae;
  },
}));
vi.mock('@/features/transaction-notification/transaction-notification.context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/transaction-notification/transaction-notification.context')>()),
  useTransactionNotification: () => mocks.notify,
}));
vi.mock('@/lib/journey', () => ({ track: (...args: unknown[]) => mocks.track(...args) }));

const SWAP_METHODS = [
  'swap_exact_tokens_for_tokens',
  'swap_tokens_for_exact_tokens',
  'swap_exact_ae_for_tokens',
  'swap_ae_for_exact_tokens',
  'swap_exact_tokens_for_ae',
  'swap_tokens_for_exact_ae',
] as const;

const NOW = 1_700_000_000_000;
const DEADLINE = BigInt(NOW + 20 * 60_000);
const ACCOUNT = 'ak_trader';
const AE = {
  address: 'AE', name: 'Aeternity', symbol: 'AE', decimals: 18, is_ae: true,
};
const WAE = {
  address: CONFIG.DEX_WAE, name: 'Wrapped AE', symbol: 'WAE', decimals: 18, is_ae: false,
};
const USDC = {
  address: 'ct_usdc', name: 'USD Coin', symbol: 'USDC', decimals: 6, is_ae: false,
};
const TKN = {
  address: 'ct_tkn', name: 'Token', symbol: 'TKN', decimals: 18, is_ae: false,
};
const SWAP_FAILED = 'Swap failed. Please review your amounts and settings and try again.';
const REJECTED = 'Transaction was rejected in your wallet.';

function swapParams(overrides: Partial<SwapExecutionParams> = {}): SwapExecutionParams {
  return {
    tokenIn: USDC,
    tokenOut: TKN,
    amountIn: '1.5',
    amountOut: '3',
    path: [USDC.address, TKN.address],
    slippagePct: 0.5,
    deadlineMins: 20,
    isExactIn: true,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function swapCalls() {
  return SWAP_METHODS.flatMap((method) => mocks.router[method].mock.calls);
}

async function runSwap(params: SwapExecutionParams) {
  const { result } = renderHook(() => useSwapExecution());
  let hash: string | null = null;
  await act(async () => { hash = await result.current.executeSwap(params); });
  return { result, hash };
}

async function failSwap(params: SwapExecutionParams) {
  const { result } = renderHook(() => useSwapExecution());
  let error: Error | undefined;
  await act(async () => {
    error = await result.current.executeSwap(params).then(() => undefined, (e: Error) => e);
  });
  return { result, error };
}

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
  mocks.account = ACCOUNT;
  mocks.router = Object.fromEntries(
    SWAP_METHODS.map((method) => [method, vi.fn().mockResolvedValue({ hash: `th_${method}` })]),
  );
  mocks.router.get_amounts_in = vi.fn();
  mocks.wae = {
    deposit: vi.fn().mockResolvedValue({ hash: 'th_wrap' }),
    withdraw: vi.fn().mockResolvedValue({ hash: 'th_unwrap' }),
  };
  mocks.notify = {
    notifySubmitted: vi.fn(),
    notifyPendingTx: vi.fn(),
    notifyConfirmed: vi.fn(),
    notifyError: vi.fn(),
  };
  mocks.ensureAllowance = vi.fn().mockResolvedValue(undefined);
  mocks.getAllowance = vi.fn().mockResolvedValue(10n ** 30n);
  mocks.initContract = vi.fn();
  mocks.addActivity = vi.fn();
  mocks.track = vi.fn();
});

describe('useSwapExecution router calls', () => {
  // Leading arguments come before (path, to, deadline, null); AE-in calls also attach the AE.
  // Exact-out rows quote a different input than was typed, so only the quote can set the bound.
  it.each([
    {
      name: 'exact-in token → token',
      params: { tokenIn: USDC, tokenOut: TKN, isExactIn: true },
      method: 'swap_exact_tokens_for_tokens',
      args: [1_500_000n, 2_985_000_000_000_000_000n],
      approval: 1_500_000n,
    },
    {
      name: 'exact-out token → token',
      params: {
        tokenIn: USDC, tokenOut: TKN, isExactIn: false, amountIn: '1.2',
      },
      quotedIn: 1_000_000n,
      method: 'swap_tokens_for_exact_tokens',
      args: [3_000_000_000_000_000_000n, 1_005_000n],
      approval: 1_005_000n,
    },
    {
      name: 'exact-in AE → token',
      params: {
        tokenIn: AE, tokenOut: TKN, isExactIn: true, amountIn: '2', amountOut: '4',
      },
      method: 'swap_exact_ae_for_tokens',
      args: [3_980_000_000_000_000_000n],
      options: { amount: 2_000_000_000_000_000_000n },
    },
    {
      name: 'exact-out AE → token',
      params: {
        tokenIn: AE, tokenOut: TKN, isExactIn: false, amountIn: '2.2', amountOut: '4',
      },
      quotedIn: 2_000_000_000_000_000_000n,
      method: 'swap_ae_for_exact_tokens',
      args: [4_000_000_000_000_000_000n],
      options: { amount: '2010000000000000000' },
    },
    {
      name: 'exact-in token → AE',
      params: {
        tokenIn: TKN, tokenOut: AE, isExactIn: true, amountIn: '10', amountOut: '5',
      },
      method: 'swap_exact_tokens_for_ae',
      args: [10_000_000_000_000_000_000n, 4_975_000_000_000_000_000n],
      approval: 10_000_000_000_000_000_000n,
    },
    {
      name: 'exact-out token → AE',
      params: {
        tokenIn: TKN, tokenOut: AE, isExactIn: false, amountIn: '11', amountOut: '5',
      },
      quotedIn: 10_000_000_000_000_000_000n,
      method: 'swap_tokens_for_exact_ae',
      args: [5_000_000_000_000_000_000n, 10_050_000_000_000_000_000n],
      approval: 10_050_000_000_000_000_000n,
    },
  ])('$name sends slippage-bounded amounts in base units', async ({
    params, quotedIn, method, args, options, approval,
  }) => {
    const swap = swapParams(params);
    if (quotedIn) mocks.router.get_amounts_in.mockResolvedValue({ decodedResult: [quotedIn, 0n] });

    const { hash } = await runSwap(swap);

    expect(hash).toBe(`th_${method}`);
    expect(swapCalls()).toHaveLength(1);
    expect(mocks.router[method]).toHaveBeenCalledWith(
      ...args,
      swap.path,
      ACCOUNT,
      DEADLINE,
      null,
      ...(options ? [options] : []),
    );
    if (quotedIn) {
      // Every exact-out call takes the wanted output first, which is also what gets quoted.
      expect(mocks.router.get_amounts_in).toHaveBeenCalledWith(args[0], swap.path);
    } else {
      expect(mocks.router.get_amounts_in).not.toHaveBeenCalled();
    }
    if (approval) {
      expect(mocks.ensureAllowance).toHaveBeenCalledTimes(1);
      expect(mocks.ensureAllowance).toHaveBeenCalledWith(
        mocks.sdk,
        params.tokenIn.address,
        ACCOUNT,
        approval,
      );
      expect(mocks.ensureAllowance.mock.invocationCallOrder[0])
        .toBeLessThan(mocks.router[method].mock.invocationCallOrder[0]);
    } else {
      expect(mocks.ensureAllowance).not.toHaveBeenCalled();
    }
  });

  it('records the swap and hands the hash to the notification banner', async () => {
    await runSwap(swapParams());

    expect(mocks.addActivity).toHaveBeenCalledWith({
      type: 'swap',
      hash: 'th_swap_exact_tokens_for_tokens',
      account: ACCOUNT,
      tokenIn: 'USDC',
      tokenOut: 'TKN',
      amountIn: '1.5',
      amountOut: '3',
    });
    expect(mocks.notify.notifyPendingTx).toHaveBeenCalledWith({
      type: TxPayloadType.SwapToken,
      tokenInSymbol: 'USDC',
      tokenOutSymbol: 'TKN',
      amountIn: '1.5',
      amountOut: '3',
    }, 'th_swap_exact_tokens_for_tokens');
    expect(mocks.track).toHaveBeenCalledWith('swap_done');
    expect(mocks.notify.notifyError).not.toHaveBeenCalled();
  });

  it.each([
    [0, 1],
    [20, 20],
    [120, 60],
  ])('clamps a %i-minute deadline to %i min from now', async (deadlineMins, expected) => {
    await runSwap(swapParams({ deadlineMins }));

    expect(mocks.router.swap_exact_tokens_for_tokens.mock.calls[0][4])
      .toBe(BigInt(NOW + expected * 60_000));
  });
});

describe('useSwapExecution approval step', () => {
  it('asks for the approval first, then the swap, while showing which step is pending', async () => {
    const approval = deferred<void>();
    const swap = deferred<{ hash: string }>();
    mocks.getAllowance.mockResolvedValueOnce(0n).mockResolvedValue(1_500_000n);
    mocks.ensureAllowance.mockReturnValue(approval.promise);
    mocks.router.swap_exact_tokens_for_tokens.mockReturnValue(swap.promise);
    const { result } = renderHook(() => useSwapExecution());

    let pending!: Promise<string | null>;
    act(() => { pending = result.current.executeSwap(swapParams()); });

    await waitFor(() => expect(result.current.swapStep)
      .toEqual({ current: 1, total: 2, label: 'Approve token' }));
    expect(result.current.loading).toBe(true);
    expect(mocks.notify.notifySubmitted).toHaveBeenCalledTimes(1);
    expect(mocks.notify.notifySubmitted).toHaveBeenCalledWith({
      type: TxPayloadType.ApproveAllowance,
      tokenName: 'USD Coin',
      tokenSymbol: 'USDC',
      amount: '1.5',
      stepNumber: 1,
      totalSteps: 2,
    });
    expect(mocks.router.swap_exact_tokens_for_tokens).not.toHaveBeenCalled();

    await act(async () => approval.resolve());
    await waitFor(() => expect(result.current.swapStep)
      .toEqual({ current: 2, total: 2, label: 'Execute swap' }));
    expect(mocks.notify.notifyConfirmed).toHaveBeenCalledWith(
      expect.objectContaining({ type: TxPayloadType.ApproveAllowance, stepNumber: 1 }),
    );
    expect(mocks.notify.notifySubmitted).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: TxPayloadType.SwapToken }),
    );

    await act(async () => {
      swap.resolve({ hash: 'th_swap' });
      await pending;
    });
    expect(result.current.swapStep).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.allowanceInfo).toBe('Allowance: 1.5 USDC');
  });

  it('skips the approval prompt when the router can already spend the amount', async () => {
    const { result } = await runSwap(swapParams());

    expect(mocks.notify.notifySubmitted).toHaveBeenCalledTimes(1);
    expect(mocks.notify.notifySubmitted).toHaveBeenCalledWith(
      expect.objectContaining({ type: TxPayloadType.SwapToken }),
    );
    expect(mocks.notify.notifyConfirmed).not.toHaveBeenCalled();
    expect(result.current.swapStep).toBeNull();
  });

  it('signs no swap when the approval is rejected', async () => {
    mocks.getAllowance.mockResolvedValue(0n);
    mocks.ensureAllowance.mockRejectedValue(new Error('Rejected by user'));

    const { result, error } = await failSwap(swapParams());

    expect(error?.message).toBe(REJECTED);
    expect(mocks.notify.notifySubmitted).toHaveBeenCalledTimes(1);
    expect(mocks.notify.notifySubmitted).toHaveBeenCalledWith(
      expect.objectContaining({ type: TxPayloadType.ApproveAllowance }),
    );
    expect(mocks.notify.notifyConfirmed).not.toHaveBeenCalled();
    expect(swapCalls()).toHaveLength(0);
    expect(result.current.swapStep).toBeNull();
  });
});

describe('useSwapExecution wrapping', () => {
  it('wraps AE through the WAE contract instead of the router', async () => {
    const { hash } = await runSwap(swapParams({
      tokenIn: AE, tokenOut: WAE, amountIn: '1.5', amountOut: '1.5', path: [],
    }));

    expect(hash).toBe('th_wrap');
    expect(mocks.initContract).toHaveBeenCalledWith(
      mocks.sdk,
      expect.objectContaining({ address: CONFIG.DEX_WAE }),
    );
    expect(mocks.wae.deposit).toHaveBeenCalledWith({ amount: '1500000000000000000' });
    expect(swapCalls()).toHaveLength(0);
    expect(mocks.addActivity).toHaveBeenCalledWith(expect.objectContaining({
      type: 'wrap', hash: 'th_wrap', tokenIn: 'AE', tokenOut: 'WAE', amountIn: '1.5',
    }));
    expect(mocks.notify.notifyPendingTx).toHaveBeenCalledWith(
      { type: TxPayloadType.WrapToken, amount: '1.5' },
      'th_wrap',
    );
  });

  it('unwraps WAE back to AE', async () => {
    const { hash } = await runSwap(swapParams({
      tokenIn: WAE, tokenOut: AE, amountIn: '2', amountOut: '2', path: [],
    }));

    expect(hash).toBe('th_unwrap');
    expect(mocks.wae.withdraw).toHaveBeenCalledWith('2000000000000000000', null);
    expect(mocks.wae.deposit).not.toHaveBeenCalled();
    expect(swapCalls()).toHaveLength(0);
    expect(mocks.addActivity).toHaveBeenCalledWith(expect.objectContaining({
      type: 'unwrap', hash: 'th_unwrap', tokenIn: 'WAE', tokenOut: 'AE',
    }));
  });
});

describe('useSwapExecution failures', () => {
  it.each([
    ['no wallet is connected', () => { mocks.account = undefined; }, swapParams()],
    ['the input token is missing', () => {}, swapParams({ tokenIn: null })],
    ['both sides are the same token', () => {}, swapParams({ tokenOut: USDC })],
    ['the input amount is zero', () => {}, swapParams({ amountIn: '0' })],
    ['no output amount was quoted', () => {}, swapParams({ amountOut: '' })],
  ])('signs nothing when %s', async (_name, arrange, params) => {
    arrange();

    const { result, error } = await failSwap(params);

    expect(error?.message).toBe(SWAP_FAILED);
    expect(mocks.notify.notifyError).toHaveBeenCalledWith(SWAP_FAILED);
    expect(mocks.notify.notifySubmitted).not.toHaveBeenCalled();
    expect(mocks.ensureAllowance).not.toHaveBeenCalled();
    expect(mocks.wae.deposit).not.toHaveBeenCalled();
    expect(swapCalls()).toHaveLength(0);
    expect(result.current.loading).toBe(false);
  });

  it('reports a missing route without signing', async () => {
    const { error } = await failSwap(swapParams({ path: [] }));

    expect(error?.message).toBe(
      'No swap route found between the selected tokens. Try a smaller amount or a different pair.',
    );
    expect(mocks.ensureAllowance).not.toHaveBeenCalled();
    expect(swapCalls()).toHaveLength(0);
  });

  it('records nothing when the wallet rejects the swap', async () => {
    mocks.router.swap_exact_tokens_for_tokens.mockRejectedValue(new Error('Rejected by user'));

    const { result, error } = await failSwap(swapParams());

    expect(error?.message).toBe(REJECTED);
    expect(mocks.notify.notifyError).toHaveBeenCalledWith(REJECTED);
    expect(mocks.addActivity).not.toHaveBeenCalled();
    expect(mocks.notify.notifyPendingTx).not.toHaveBeenCalled();
    expect(mocks.track).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
    expect(result.current.swapStep).toBeNull();
  });

  it('treats a result without a transaction hash as a failure', async () => {
    mocks.router.swap_exact_tokens_for_tokens.mockResolvedValue({});

    const { error } = await failSwap(swapParams());

    expect(error?.message).toBe(SWAP_FAILED);
    expect(mocks.addActivity).not.toHaveBeenCalled();
    expect(mocks.notify.notifyPendingTx).not.toHaveBeenCalled();
  });
});
