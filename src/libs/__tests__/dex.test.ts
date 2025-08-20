import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ACI,
  DEX_ADDRESSES,
  toAettos,
  fromAettos,
  addSlippage,
  subSlippage,
  ensureAllowanceForRouter,
  fetchPairReserves,
  initDexContracts,
} from '../../libs/dex';

describe('libs/dex helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('converts to/from aettos with decimals', () => {
    expect(toAettos('1', 18)).toBe(1000000000000000000n);
    expect(toAettos('0.000000000000000001', 18)).toBe(1n);
    expect(fromAettos('1000000000000000000', 18)).toBe('1');
    expect(fromAettos(1500, 3)).toBe('1.5');
  });

  it('applies slippage up and down with floor rounding', () => {
    expect(addSlippage(1000n, 5)).toBe(1050n);
    expect(subSlippage(1000n, 5)).toBe(950n);
    expect(addSlippage(1n, 0.1)).toBe(1n); // floor
  });

  it('ensureAllowanceForRouter creates or changes allowance as needed', async () => {
    const created: any[] = [];
    const changed: any[] = [];

    const tokenMock = {
      allowance: vi.fn().mockResolvedValue({ decodedResult: undefined }),
      create_allowance: vi.fn(async (forAcc: string, val: bigint) => { created.push([forAcc, val]); }),
      change_allowance: vi.fn(async (forAcc: string, delta: bigint) => { changed.push([forAcc, delta]); }),
    };
    const sdk: any = {
      initializeContract: vi.fn(async ({ aci, address }: any) => {
        if (aci === ACI.AEX9) return tokenMock;
        throw new Error('unexpected aci');
      }),
    };

    const owner = 'ak_owner';
    await ensureAllowanceForRouter(sdk, 'ct_token', owner, 100n);
    expect(tokenMock.allowance).toHaveBeenCalled();
    expect(created.length).toBe(1);
    expect(created[0][0]).toBe(DEX_ADDRESSES.router.replace('ct_', 'ak_'));
    expect(created[0][1]).toBe(100n);

    // Now pretend we have some allowance and need to increase
    tokenMock.allowance.mockResolvedValueOnce({ decodedResult: 30n });
    await ensureAllowanceForRouter(sdk, 'ct_token', owner, 100n);
    expect(changed.length).toBe(1);
    expect(changed[0][1]).toBe(70n);

    // Enough allowance → no-op
    tokenMock.allowance.mockResolvedValueOnce({ decodedResult: 150n });
    await ensureAllowanceForRouter(sdk, 'ct_token', owner, 100n);
    expect(created.length).toBe(1);
    expect(changed.length).toBe(1);
  });

  it('fetchPairReserves maps reserves based on token0', async () => {
    const pair = {
      token0: vi.fn(async () => ({ decodedResult: 'ct_A' })),
      get_reserves: vi.fn(async () => ({ decodedResult: { reserve0: 5, reserve1: 7, block_timestamp_last: 0 } })),
    };
    const factory = { get_pair: vi.fn(async () => ({ decodedResult: 'ct_pair' })) };
    const sdk: any = {
      initializeContract: vi.fn(async ({ aci }: any) => {
        if (aci === ACI.Pair) return pair;
        if (aci === ACI.Factory) return factory;
        throw new Error('unexpected');
      }),
    };
    const res = await fetchPairReserves(sdk, factory, 'ct_A', 'ct_B');
    expect(res).toEqual({ reserveA: 5n, reserveB: 7n, token0: 'ct_A' });
  });

  it('initDexContracts initializes router and factory', async () => {
    const router = { factory: vi.fn(async () => ({ decodedResult: 'ct_factory' })) };
    const factory = {};
    const sdk: any = {
      initializeContract: vi.fn(async ({ aci, address }: any) => {
        if (aci === ACI.Router) return router;
        if (aci === ACI.Factory) return factory; // allow fallback to known address in implementation
        throw new Error('unexpected');
      }),
    };
    const res = await initDexContracts(sdk);
    expect(res.router).toBe(router);
    expect(res.factory).toBe(factory);
  });
});


