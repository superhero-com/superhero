import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getAllTokens,
  getGraph,
  getHistory,
  getListedTokens,
  getPairs,
  getSwapRoutes,
} from '../dexBackend';

/** Mock global fetch, routing canned JSON by URL substring. */
function mockFetch(routes: Array<{ match: string; body: any; ok?: boolean }>) {
  const calls: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      calls.push(url);
      const route = routes.find((r) => url.includes(r.match));
      if (!route) throw new Error(`unexpected fetch: ${url}`);
      return {
        ok: route.ok ?? true,
        json: async () => route.body,
      } as any;
    }),
  );
  return calls;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('dexBackend adapters (superhero-api)', () => {
  it('getListedTokens unwraps items and projects the 4 fields', async () => {
    const calls = mockFetch([
      {
        match: 'dex/tokens?listed=true',
        body: {
          items: [
            {
              address: 'ct_a',
              name: 'Alpha',
              symbol: 'AAA',
              decimals: 18,
              listed: true,
              price: { ae: 1 },
            },
          ],
        },
      },
    ]);

    const result = await getListedTokens();

    expect(calls[0]).toContain('/api/dex/tokens?listed=true');
    expect(result).toEqual([
      { address: 'ct_a', name: 'Alpha', symbol: 'AAA', decimals: 18 },
    ]);
  });

  it('getAllTokens flattens nested price + summary into the legacy shape', async () => {
    mockFetch([
      {
        match: 'dex/tokens?limit=100',
        body: {
          items: [
            {
              address: 'ct_a',
              name: 'Alpha',
              symbol: 'AAA',
              decimals: 18,
              pairs_count: 5,
              price: { ae: 0.5, usd: 1.25 },
              summary: {
                total_volume: { usd: 9999 },
                change: {
                  '24h': { volume: { usd: 100 }, percentage: '3.5' },
                },
              },
            },
          ],
        },
      },
    ]);

    const [t] = (await getAllTokens())!;

    expect(t.priceUsd).toBe('1.25');
    expect(t.pairs).toBe(5);
    expect(t.priceChangeDay).toBe('3.5');
    expect(t.volumeUsdDay).toBe('100');
    expect(t.volumeUsdAll).toBe('9999');
  });

  it('getPairs flattens tokens to addresses, computes TVL, and derives synchronized', async () => {
    mockFetch([
      {
        match: 'dex/pairs?limit=100',
        body: {
          items: [
            {
              address: 'ct_pair',
              transactions_count: 7,
              reserve0: '2000000000000000000', // 2 tokens @ 18dp
              reserve1: '5000000', // 5 tokens @ 6dp
              token0: {
                address: 'ct_0',
                symbol: 'AAA',
                decimals: 18,
                price: { usd: 3 },
              },
              token1: {
                address: 'ct_1',
                symbol: 'BBB',
                decimals: 6,
                price: { usd: 2 },
              },
            },
          ],
        },
      },
    ]);

    const [p] = (await getPairs(false))!;

    expect(p.token0).toBe('ct_0');
    expect(p.token1).toBe('ct_1');
    expect(p.token0Symbol).toBe('AAA');
    expect(p.transactions).toBe(7);
    expect(p.synchronized).toBe(true);
    // 2*3 + 5*2 = 16
    expect(p.tvlUsd).toBe('16');
  });

  it('getAllTokens walks every page reported by meta.totalPages', async () => {
    const mkToken = (address: string) => ({
      address, name: address, symbol: address, decimals: 18, price: { ae: 1 },
    });
    const calls = mockFetch([
      {
        match: 'page=1',
        body: { items: [mkToken('ct_a'), mkToken('ct_b')], meta: { totalPages: 3 } },
      },
      {
        match: 'page=2',
        body: { items: [mkToken('ct_c')], meta: { totalPages: 3 } },
      },
      {
        match: 'page=3',
        body: { items: [mkToken('ct_d')], meta: { totalPages: 3 } },
      },
    ]);

    const result = (await getAllTokens())!;

    expect(calls).toHaveLength(3);
    expect(result.map((t) => t.address)).toEqual(['ct_a', 'ct_b', 'ct_c', 'ct_d']);
  });

  it('getPairs stops paginating on a short page when meta is absent', async () => {
    const mkPair = (address: string) => ({
      address,
      token0: { address: 'ct_0', symbol: 'AAA', decimals: 18 },
      token1: { address: 'ct_1', symbol: 'BBB', decimals: 18 },
    });
    // Page 1 is full (100 items) so a second page is requested; page 2 is short,
    // so pagination stops there (no meta to rely on).
    const calls = mockFetch([
      {
        match: 'page=1',
        body: { items: Array.from({ length: 100 }, (_, i) => mkPair(`ct_${i}`)) },
      },
      {
        match: 'page=2',
        body: { items: [mkPair('ct_last')] },
      },
    ]);

    const result = (await getPairs(false))!;

    expect(calls).toHaveLength(2);
    expect(result).toHaveLength(101);
  });

  it('getSwapRoutes passes the legacy route shape through unchanged', async () => {
    const routes = [
      [
        {
          address: 'ct_pair',
          synchronized: true,
          token0: 'ct_0',
          token1: 'ct_1',
          liquidityInfo: {
            totalSupply: '300',
            reserve0: '100',
            reserve1: '200',
          },
        },
      ],
    ];
    const calls = mockFetch([{ match: 'dex/swap-routes/', body: routes }]);

    const result = await getSwapRoutes('ct_0', 'ct_1');

    expect(calls[0]).toContain('/api/dex/swap-routes/ct_0/ct_1');
    expect(result).toEqual(routes);
  });

  it('getGraph maps Price candles to {labels,data} and returns null for TVL', async () => {
    mockFetch([
      {
        match: 'dex/tokens/ct_a/history',
        body: [
          {
            timeClose: '2025-01-01T01:00:00.000Z',
            quote: { close: '1.5', volume: 10 },
          },
          {
            timeClose: '2025-01-01T02:00:00.000Z',
            quote: { close: '1.8', volume: 20 },
          },
        ],
      },
    ]);

    const price = await getGraph({
      graphType: 'Price',
      timeFrame: '1W',
      tokenAddress: 'ct_a',
    });
    expect(price?.data).toEqual([1.5, 1.8]);
    expect(price?.labels).toEqual([
      new Date('2025-01-01T01:00:00.000Z').getTime(),
      new Date('2025-01-01T02:00:00.000Z').getTime(),
    ]);

    // TVL has no data source on the new backend.
    const tvl = await getGraph({
      graphType: 'TVL',
      timeFrame: '1W',
      tokenAddress: 'ct_a',
    });
    expect(tvl).toBeNull();
  });

  it('getHistory maps swaps, derives in/out, and sends since as from_date', async () => {
    const since = Date.parse('2025-01-01T00:00:00.000Z');
    const calls = mockFetch([
      {
        match: 'dex/transactions',
        body: {
          items: [
            {
              tx_hash: 'th_x',
              tx_type: 'swap_exact_tokens_for_tokens',
              account_address: 'ak_a',
              created_at: '2025-01-02T00:00:00.000Z',
              pair: {
                address: 'ct_pair',
                token0: { address: 'ct_0', symbol: 'AAA', decimals: 18 },
                token1: { address: 'ct_1', symbol: 'WAE', decimals: 18 },
              },
              swap_info: {
                amount0In: '1000000000000000000',
                amount1In: '0',
                amount0Out: '0',
                amount1Out: '2000000000000000000',
              },
            },
          ],
        },
      },
    ]);

    const [tx] = (await getHistory({ limit: 100, since, type: 'swap' }))!;

    expect(calls[0]).toContain('from_date=2025-01-01T00%3A00%3A00.000Z');
    expect(tx.txHash).toBe('th_x');
    expect(tx.type).toBe('swap');
    expect(tx.tokenInSymbol).toBe('AAA');
    expect(tx.tokenOutSymbol).toBe('WAE');
    expect(tx.amountIn).toBe('1');
    expect(tx.amountOut).toBe('2');
  });

  it('getHistory filters by legacy category client-side', async () => {
    mockFetch([
      {
        match: 'dex/transactions',
        body: {
          items: [
            {
              tx_hash: 'th_swap',
              tx_type: 'swap_exact_tokens_for_tokens',
              created_at: '2025-01-02T00:00:00.000Z',
              pair: {
                address: 'ct_pair',
                token0: { address: 'ct_0', symbol: 'AAA', decimals: 18 },
                token1: { address: 'ct_1', symbol: 'WAE', decimals: 18 },
              },
              swap_info: { amount0In: '1', amount1Out: '1' },
            },
            {
              tx_hash: 'th_add',
              tx_type: 'add_liquidity',
              created_at: '2025-01-02T00:00:00.000Z',
              pair: {
                address: 'ct_pair',
                token0: { address: 'ct_0', symbol: 'AAA', decimals: 18 },
                token1: { address: 'ct_1', symbol: 'WAE', decimals: 18 },
              },
            },
          ],
        },
      },
    ]);

    const result = (await getHistory({ type: 'add' }))!;

    expect(result).toHaveLength(1);
    expect(result[0].txHash).toBe('th_add');
    expect(result[0].type).toBe('add');
  });

  it('returns null on a non-ok response', async () => {
    mockFetch([{ match: 'dex/tokens?limit=100', body: {}, ok: false }]);
    expect(await getAllTokens()).toBeNull();
  });
});
