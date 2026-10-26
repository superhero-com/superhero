import { act, renderHook } from '@testing-library/react';
import {
  beforeEach, describe, expect, it, vi,
} from 'vitest';
import { CONFIG } from '@/config';
import { useAddLiquidity } from '../useAddLiquidity';

const mocks = vi.hoisted(() => ({
  getPairInfo: vi.fn(),
  getPairBalance: vi.fn(),
  allowance: vi.fn(),
  removeAe: vi.fn(),
  remove: vi.fn(),
  addActivity: vi.fn(),
  notifyError: vi.fn(),
}));
vi.mock('@/hooks/useAeSdk', () => ({ useAeSdk: () => ({ sdk: {} }) }));
vi.mock('@/hooks/useAccount', () => ({ useAccount: () => ({ activeAccount: 'ak_me' }) }));
vi.mock('@/hooks/useDex', () => ({ useDex: () => ({}) }));
vi.mock('@/hooks/useRecentActivities', () => ({ useRecentActivities: () => ({ addActivity: mocks.addActivity }) }));
vi.mock('@/features/transaction-notification/transaction-notification.context', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/features/transaction-notification/transaction-notification.context')>(),
  useTransactionNotification: () => ({ notifySubmitted: vi.fn(), notifyPendingTx: vi.fn(), notifyError: mocks.notifyError }),
}));
vi.mock('../useLiquidityPreview', () => ({
  useLiquidityPreview: () => ({
    status: 'idle', pairExists: false, preview: null, refetch: vi.fn(),
  }),
}));
vi.mock('@/libs/dex', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/libs/dex')>(),
  initDexContracts: async () => ({ router: { remove_liquidity_ae: mocks.removeAe, remove_liquidity: mocks.remove }, factory: {} }),
  getPairInfo: mocks.getPairInfo,
  getPairBalance: mocks.getPairBalance,
  ensurePairAllowanceForRouter: mocks.allowance,
}));

const LP = 10n ** 18n;
const pool = {
  pairAddress: 'ct_pair', reserveA: 2000n * LP, reserveB: 1000n * LP, totalSupply: 100n * LP,
};
const aePool = {
  tokenA: CONFIG.DEX_WAE, tokenB: 'ct_token', slippagePct: 5, deadlineMins: 30, isAePair: true,
};
const tokenPool = {
  ...aePool, tokenA: 'ct_a', tokenB: 'ct_b', isAePair: false,
};
// The indexer still reports 4 LP while the pair contract already holds 4.5 LP.
const fullRemoval = { liquidity: '4', isFullRemoval: true, rawBalance: (4n * LP).toString() };
const onChain = (45n * LP) / 10n;
beforeEach(() => {
  mocks.getPairInfo.mockResolvedValue(pool);
  mocks.getPairBalance.mockResolvedValue(onChain);
  mocks.allowance.mockResolvedValue(undefined);
  mocks.removeAe.mockResolvedValue({ hash: 'th_ae' });
  mocks.remove.mockResolvedValue({ hash: 'th_tokens' });
});

describe('liquidity removal', () => {
  // 4.5 of 100 LP: 90 of the 2000 first reserve and 45 of the 1000 second, minus 5% slippage.
  const minimums = [(855n * LP) / 10n, (4275n * LP) / 100n];
  it.each([
    {
      name: 'an AE pool', params: aePool, router: mocks.removeAe, tokens: ['ct_token'], hash: 'th_ae',
    },
    {
      name: 'a token pool', params: tokenPool, router: mocks.remove, tokens: ['ct_a', 'ct_b'], hash: 'th_tokens',
    },
  ])('burns the whole on-chain LP balance on full removal from $name', async ({
    params, router, tokens, hash,
  }) => {
    const { result } = renderHook(() => useAddLiquidity());
    let sent = '';
    await act(async () => { sent = await result.current.executeRemoveLiquidity({ ...params, ...fullRemoval }); });
    expect(sent).toBe(hash);
    expect(mocks.getPairBalance).toHaveBeenCalledWith(expect.anything(), 'ct_pair', 'ak_me');
    expect(mocks.allowance).toHaveBeenCalledWith(expect.anything(), 'ct_pair', 'ak_me', onChain);
    const expected = [...tokens, onChain, ...minimums, 'ak_me'];
    expect(router.mock.calls[0].slice(0, expected.length)).toEqual(expected);
    expect(mocks.addActivity).toHaveBeenCalledWith(expect.objectContaining({ type: 'remove_liquidity', amountIn: '4.5' }));
  });

  it.each([
    ['a partial amount above it', { liquidity: '3' }, 2n * LP],
    ['a full removal of an emptied position', fullRemoval, 0n],
  ])('stops before any approval when the on-chain LP balance cannot cover %s', async (_, amount, balance) => {
    mocks.getPairBalance.mockResolvedValue(balance);
    const { result } = renderHook(() => useAddLiquidity());
    await act(async () => {
      await expect(result.current.executeRemoveLiquidity({ ...aePool, ...amount }))
        .rejects.toThrow('Not enough balance to complete this operation.');
    });
    expect(mocks.notifyError).toHaveBeenCalledWith('Not enough balance to complete this operation.');
    expect(mocks.allowance).not.toHaveBeenCalled();
    expect(mocks.removeAe).not.toHaveBeenCalled();
  });
});
