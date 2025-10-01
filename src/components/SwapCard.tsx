import BigNumber from 'bignumber.js';
import { useEffect, useMemo, useState } from 'react';
import { TrendminerApi } from '../api/backend';
import { DEX_ADDRESSES, ensureAllowanceForRouter, fromAettos, initDexContracts, subSlippage, toAettos } from '../libs/dex';
import TradeCard from '../views/Trendminer/TradeCard';
import AeButton from './AeButton';
import MobileCard from './MobileCard';
import MobileInput from './MobileInput';

import { useAeSdk, useWalletConnect } from '../hooks';

type TokenItem = any;

export default function SwapCard() {
  const { sdk, activeAccount } = useAeSdk()
  const { connectWallet } = useWalletConnect()

  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [selected, setSelected] = useState<TokenItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'bridge' | 'trade'>('bridge');

  // ETH -> AE swap state
  const [router, setRouter] = useState<any | null>(null);
  const [amountIn, setAmountIn] = useState('');
  const [amountOut, setAmountOut] = useState('');
  const [quoting, setQuoting] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [slippage, setSlippage] = useState(5);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await TrendminerApi.listTokens({ orderBy: 'market_cap', orderDirection: 'DESC', limit: 50 });
        const items = Array.isArray((res as any)?.data) ? (res as any).data : (res as any)?.items || res;
        if (!ignore) {
          setTokens(items || []);
          setSelected((items || [])[0] || null);
        }
      } catch (e: any) {
        if (!ignore) setError(e?.message || 'Failed to load tokens');
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    load();
    return () => { ignore = true; };
  }, []);


  useEffect(() => {
    (async () => {
      const { router: r } = await initDexContracts(sdk);
      setRouter(r);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tokens;
    return tokens.filter((t: any) =>
      String(t?.symbol || '').toLowerCase().includes(q) ||
      String(t?.name || '').toLowerCase().includes(q) ||
      String(t?.address || '').toLowerCase().includes(q),
    );
  }, [search, tokens]);


  async function quote() {
    setQuoting(true);
    setSwapError(null);
    try {
      const ain = toAettos(amountIn, 18);
      const path = [DEX_ADDRESSES.aeeth, DEX_ADDRESSES.wae];
      const { decodedResult } = await router.get_amounts_out(ain, path);
      const out = decodedResult[decodedResult.length - 1];
      setAmountOut(fromAettos(out, 18));
    } catch (e: any) {
      setSwapError(e?.message || 'Quote failed');
    } finally {
      setQuoting(false);
    }
  }

  async function doSwap() {
    if (!router || !sdk || !activeAccount) return;
    setSwapping(true);
    setSwapError(null);
    try {
      const deadline = Date.now() + 30 * 60_000;
      const ain = toAettos(amountIn, 18);
      const path = [DEX_ADDRESSES.aeeth, DEX_ADDRESSES.wae];

      // Ensure allowance for aeETH
      await ensureAllowanceForRouter(sdk, DEX_ADDRESSES.aeeth, activeAccount, ain);

      const { decodedResult } = await router.get_amounts_out(ain, path);
      const out = decodedResult[decodedResult.length - 1] as bigint;
      const minOut = subSlippage(out, slippage);

      await router.swap_exact_tokens_for_ae(ain, minOut, path, activeAccount, deadline, null);

      setAmountIn('');
      setAmountOut('');
    } catch (e: any) {
      setSwapError(e?.message || 'Swap failed');
    } finally {
      setSwapping(false);
    }
  }

  const canSwap = useMemo(() => {
    const a = new BigNumber(amountIn);
    return !!activeAccount && !!router && a.isFinite() && a.gt(0);
  }, [activeAccount, router, amountIn]);

  return (
    <div className="grid gap-3">
      <div className="text-base font-semibold text-white">ETHXIT</div>
      <div className="text-xs opacity-80 leading-tight text-white/80">
        Bridge from Ethereum and convert aeETH to AE. For trading other tokens, use the DEX.{' '}
        <a 
          href="https://swap.superhero.com" 
          target="_blank" 
          rel="noreferrer" 
          className="underline text-green-400 hover:text-green-300 transition-colors"
        >
          Learn more
        </a>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('bridge')}
          className={`
            px-2.5 py-1.5 rounded-md text-sm font-medium flex-1 transition-all duration-200
            border border-white/20 text-white
            ${tab === 'bridge' 
              ? 'bg-white/10 border-green-500/30 shadow-sm' 
              : 'bg-white/5 hover:bg-white/8'
            }
          `}
        >
          Bridge & Swap
        </button>
        <button
          onClick={() => setTab('trade')}
          className={`
            px-2.5 py-1.5 rounded-md text-sm font-medium flex-1 transition-all duration-200
            border border-white/20 text-white
            ${tab === 'trade' 
              ? 'bg-white/10 border-green-500/30 shadow-sm' 
              : 'bg-white/5 hover:bg-white/8'
            }
          `}
        >
          Token Sale
        </button>
      </div>

      {tab === 'bridge' && (
        <MobileCard variant="elevated" padding="medium">
          <div className="grid gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-300 mb-2">
                Convert aeETH to AE
              </div>
              <div className="text-xs opacity-70 text-white/70">
                First bridge ETH → aeETH, then swap aeETH → AE
              </div>
            </div>

            {!activeAccount ? (
              <AeButton
                onClick={connectWallet}
                className="large block"
                green
              >
                <span className="text-sm">CONNECT WALLET</span>
              </AeButton>
            ) : (
              <div className="text-xs opacity-80 text-center text-white/80">
                Connected: {activeAccount.slice(0, 8)}...{activeAccount.slice(-6)}
              </div>
            )}

            <div className="grid gap-3">
              <MobileInput
                label="From (aeETH)"
                placeholder="0.0"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                variant="filled"
                size="large"
                leftIcon={
                  <span className="text-sm font-semibold min-w-10 text-center text-white">
                    aeETH
                  </span>
                }
              />

              <div className="text-center text-xl opacity-60 text-white/60">⬇️</div>

              <MobileInput
                label="To (AE)"
                placeholder="0.0"
                value={amountOut}
                onChange={(e) => setAmountOut(e.target.value)}
                variant="filled"
                size="large"
                leftIcon={
                  <span className="text-sm font-semibold min-w-10 text-center text-white">
                    AE
                  </span>
                }
                readOnly
              />
            </div>

            <div className="grid gap-2">
              <div className="flex gap-2">
                <AeButton
                  onClick={quote}
                  disabled={!router || quoting || !amountIn}
                  className="large flex-1"
                >
                  {quoting ? 'Getting Quote...' : 'Get Quote'}
                </AeButton>
                <AeButton
                  onClick={doSwap}
                  disabled={!canSwap || swapping}
                  className="large flex-1"
                  green
                >
                  {swapping ? 'Swapping...' : 'Swap'}
                </AeButton>
              </div>
            </div>

            <div className="flex gap-2 items-center justify-center">
              <label htmlFor="slippage" className="text-xs text-white/80">
                Slippage:
              </label>
              <input
                id="slippage"
                name="slippage"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={slippage}
                onChange={(e) => setSlippage(Number(e.target.value))}
                className="w-20 px-2 py-1 text-xs rounded border border-white/20 bg-white/5 text-white focus:border-green-500 focus:outline-none"
              />
              <span className="text-xs text-white/80">%</span>
            </div>

            {swapError && (
              <div className="text-red-400 text-xs text-center p-2 bg-red-500/10 rounded-md border border-red-500/30">
                {swapError}
              </div>
            )}

            <div className="text-xs opacity-60 text-center p-2 bg-white/5 rounded-md text-white/60">
              <div className="mb-1">💡 Need to bridge ETH first?</div>
              <a
                href="https://swap.superhero.com"
                target="_blank"
                rel="noreferrer"
                className="underline text-green-400 hover:text-green-300 transition-colors"
              >
                Visit Superhero Swap
              </a>
            </div>
          </div>
        </MobileCard>
      )}

      {tab === 'trade' && (
        <>
          <div className="grid gap-2">
            <input
              id="token-search"
              name="search"
              type="text"
              placeholder="Search token"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2.5 py-2 text-sm rounded-md border border-white/20 bg-white/5 text-white placeholder:text-white/50 focus:border-green-500 focus:outline-none transition-colors"
            />
            <select
              id="token-select"
              name="token"
              value={selected?.address || ''}
              onChange={(e) => {
                const next = tokens.find((t: any) => t.address === e.target.value);
                setSelected(next || null);
              }}
              className="w-full px-2.5 py-2 text-sm rounded-md border border-white/20 bg-white/5 text-white focus:border-green-500 focus:outline-none transition-colors"
            >
              {filtered.map((t: any) => (
                <option key={t.address} value={t.address} className="bg-gray-800 text-white">
                  {(t.symbol || t.name || 'Token')} {t.symbol ? '' : ''}
                </option>
              ))}
            </select>
          </div>

          {loading && (
            <div className="opacity-80 text-sm text-white/80">Loading tokens…</div>
          )}
          {error && (
            <div className="text-red-400 text-xs">{error}</div>
          )}

          {selected && (
            <div className="border border-white/20 rounded-lg p-2.5 bg-white/5">
              <TradeCard token={selected} />
            </div>
          )}
        </>
      )}
    </div>
  );
}


