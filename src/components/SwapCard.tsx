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
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ fontWeight: 600, fontSize: 16 }}>ETHXIT</div>
      <div style={{ fontSize: 12, opacity: 0.8, lineHeight: 1.35 }}>
        Bridge from Ethereum and convert aeETH to AE. For trading other tokens, use the DEX.{' '}
        <a href="https://swap.superhero.com" target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>Learn more</a>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => setTab('bridge')}
          style={{
            padding: '6px 10px', borderRadius: 6,
            border: '1px solid #3a3a4a', background: tab === 'bridge' ? '#2a2a39' : '#1a1a23', color: '#fff',
            flex: 1,
          }}
        >Bridge & Swap</button>
        <button
          onClick={() => setTab('trade')}
          style={{
            padding: '6px 10px', borderRadius: 6,
            border: '1px solid #3a3a4a', background: tab === 'trade' ? '#2a2a39' : '#1a1a23', color: '#fff',
            flex: 1,
          }}
        >Token Sale</button>
      </div>

      {tab === 'bridge' && (
        <MobileCard variant="elevated" padding="medium">
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: '#c3c3c7', marginBottom: 8 }}>
                Convert aeETH to AE
              </div>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                First bridge ETH → aeETH, then swap aeETH → AE
              </div>
            </div>

            {!activeAccount ? (
              <AeButton
                onClick={connectWallet}
                className="large block"
                green
              >
                Connect Wallet
              </AeButton>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.8, textAlign: 'center' }}>
                Connected: {activeAccount.slice(0, 8)}...{activeAccount.slice(-6)}
              </div>
            )}

            <div style={{ display: 'grid', gap: 12 }}>
              <MobileInput
                label="From (aeETH)"
                placeholder="0.0"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                variant="filled"
                size="large"
                leftIcon={<span style={{ fontSize: 14, fontWeight: 600, minWidth: '40px', textAlign: 'center' }}>aeETH</span>}
              />

              <div style={{ textAlign: 'center', fontSize: 20, opacity: 0.6 }}>↓</div>

              <MobileInput
                label="To (AE)"
                placeholder="0.0"
                value={amountOut}
                onChange={(e) => setAmountOut(e.target.value)}
                variant="filled"
                size="large"
                leftIcon={<span style={{ fontSize: 14, fontWeight: 600, minWidth: '40px', textAlign: 'center' }}>AE</span>}
                readOnly
              />
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <AeButton
                  onClick={quote}
                  disabled={!router || quoting || !amountIn}
                  className="large"
                  style={{ flex: 1 }}
                >
                  {quoting ? 'Getting Quote...' : 'Get Quote'}
                </AeButton>
                <AeButton
                  onClick={doSwap}
                  disabled={!canSwap || swapping}
                  className="large"
                  green
                  style={{ flex: 1 }}
                >
                  {swapping ? 'Swapping...' : 'Swap'}
                </AeButton>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
              <label htmlFor="slippage" style={{ fontSize: 12 }}>Slippage:</label>
              <input
                id="slippage"
                name="slippage"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={slippage}
                onChange={(e) => setSlippage(Number(e.target.value))}
                style={{
                  width: 80,
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid #3a3a4a',
                  background: '#1a1a23',
                  color: '#fff',
                  fontSize: 12
                }}
              />
              <span style={{ fontSize: 12 }}>%</span>
            </div>

            {swapError && (
              <div style={{
                color: '#ff6b6b',
                fontSize: 13,
                textAlign: 'center',
                padding: '8px',
                background: 'rgba(255, 107, 107, 0.1)',
                borderRadius: 6,
                border: '1px solid rgba(255, 107, 107, 0.3)'
              }}>
                {swapError}
              </div>
            )}

            <div style={{
              fontSize: 11,
              opacity: 0.6,
              textAlign: 'center',
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 6
            }}>
              <div>💡 Need to bridge ETH first?</div>
              <a
                href="https://swap.superhero.com"
                target="_blank"
                rel="noreferrer"
                style={{
                  textDecoration: 'underline',
                  color: '#4CAF50'
                }}
              >
                Visit Superhero Swap
              </a>
            </div>
          </div>
        </MobileCard>
      )}

      {tab === 'trade' && (
        <>
          <div style={{ display: 'grid', gap: 8 }}>
            <input
              id="token-search"
              name="search"
              type="text"
              placeholder="Search token"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #3a3a4a', background: '#1a1a23', color: '#fff' }}
            />
            <select
              id="token-select"
              name="token"
              value={selected?.address || ''}
              onChange={(e) => {
                const next = tokens.find((t: any) => t.address === e.target.value);
                setSelected(next || null);
              }}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #3a3a4a', background: '#1a1a23', color: '#fff' }}
            >
              {filtered.map((t: any) => (
                <option key={t.address} value={t.address}>
                  {(t.symbol || t.name || 'Token')} {t.symbol ? '' : ''}
                </option>
              ))}
            </select>
          </div>

          {loading && <div style={{ opacity: 0.8, fontSize: 14 }}>Loading tokens…</div>}
          {error && <div style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</div>}

          {selected && (
            <div style={{ border: '1px solid #3a3a4a', borderRadius: 8, padding: 10, background: '#1a1a23' }}>
              <TradeCard token={selected} />
            </div>
          )}
        </>
      )}
    </div>
  );
}


