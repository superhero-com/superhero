import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import DexTabs from '../components/dex/DexTabs';
import DexSettings from '../components/dex/DexSettings';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';
import { initSdk, scanForWallets } from '../store/slices/aeternitySlice';
import { setSlippage } from '../store/slices/dexSlice';
import ConnectWalletButton from '../components/ConnectWalletButton';
import {
  DEX_ADDRESSES,
  initDexContracts,
  ensureAllowanceForRouter,
  toAettos,
  fromAettos,
  subSlippage,
  addSlippage,
  fetchPairReserves,
} from '../libs/dex';
import { getPriceImpactForRoute } from '../libs/swapUtils';
import { getRouterTokenAllowance, getTokenBalance } from '../libs/dex';
import { errorToUserMessage } from '../libs/errorMessages';
import { useToast } from '../components/ToastProvider';
import { CONFIG } from '../config';
// @ts-ignore
import WaeAci from 'dex-contracts-v2/build/WAE.aci.json';
import { bridgeEthToAe } from '../libs/bridge';
import './Dex.scss';

type SelectToken = {
  contractId: string | 'AE';
  symbol: string;
  decimals: number;
  isAe?: boolean;
};

function useTokenList(): [SelectToken[], boolean] {
  const [list, setList] = useState<SelectToken[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      try {
        // eslint-disable-next-line no-console
        console.info('[dex] Loading token list…');
        const { getListedTokens } = await import('../libs/dexBackend');
        const resp = await getListedTokens();
        // eslint-disable-next-line no-console
        console.info('[dex] Token list fetched from backend', { count: (resp || []).length });
        // Build and de-duplicate by contractId to avoid duplicate React keys
        const raw: SelectToken[] = [
          { contractId: 'AE', symbol: 'AE', decimals: 18, isAe: true },
          { contractId: DEX_ADDRESSES.wae, symbol: 'WAE', decimals: 18 },
          ...(resp || []).map((t: any) => ({
            contractId: t.address,
            symbol: t.symbol || t.name || 'TKN',
            decimals: Number(t.decimals || 18),
          })),
        ];
        const uniqueByAddress = new Map<string, SelectToken>();
        for (const token of raw) {
          if (!token?.contractId) continue;
          if (!uniqueByAddress.has(token.contractId)) uniqueByAddress.set(token.contractId, token);
        }
        const tokens = Array.from(uniqueByAddress.values());
        const removed = raw.length - tokens.length;
        if (removed > 0) {
          // eslint-disable-next-line no-console
          console.info('[dex] Deduplicated token list by contractId', { removed, finalCount: tokens.length });
        }
        if (!ignore) setList(tokens);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[dex] Failed to load tokens, using defaults', e);
        if (!ignore) setList([
          { contractId: 'AE', symbol: 'AE', decimals: 18, isAe: true },
          { contractId: DEX_ADDRESSES.wae, symbol: 'WAE', decimals: 18 },
        ]);
      } finally {
        if (!ignore) setLoading(false);
        // eslint-disable-next-line no-console
        console.info('[dex] Token list load finished');
      }
    }
    load();
    return () => { ignore = true; };
  }, []);
  return [list, loading];
}

export default function Dex() {
  const dispatch = useDispatch<AppDispatch>();
  const address = useSelector((s: RootState) => s.root.address);
  const location = useLocation();
  const [tokens, tokensLoading] = useTokenList();

  const [tokenIn, setTokenIn] = useState<SelectToken | null>(null);
  const [tokenOut, setTokenOut] = useState<SelectToken | null>(null);
  const [amountIn, setAmountIn] = useState<string>('');
  const [amountOut, setAmountOut] = useState<string>('');
  const [isExactIn, setIsExactIn] = useState<boolean>(true);
  const slippagePct = useSelector((s: RootState) => s.dex.slippagePct);
  const deadlineMins = useSelector((s: RootState) => s.dex.deadlineMins);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [path, setPath] = useState<string[]>([]);
  const [routesFromBackend, setRoutesFromBackend] = useState<any[][] | null>(null);
  const [priceImpactPct, setPriceImpactPct] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const quoteSeqRef = useRef(0);
  const quoteTimerRef = useRef<number | null>(null);
  const [wrapping, setWrapping] = useState(false);
  const [allowanceInfo, setAllowanceInfo] = useState<string | null>(null);
  const [balances, setBalances] = useState<{ in?: string; out?: string }>({});
  const [searchIn, setSearchIn] = useState('');
  const [searchOut, setSearchOut] = useState('');
  const [wrapAmount, setWrapAmount] = useState<string>('');
  const [wrapBalances, setWrapBalances] = useState<{ ae?: string; wae?: string }>({});
  const toast = useToast();
  const [recent, setRecent] = useState<Array<{ type: 'swap'|'wrap'|'unwrap'; hash?: string }>>([]);
  // ETHXIT mini widget state (aeETH -> AE)
  const [ethxitIn, setEthxitIn] = useState('');
  const [ethxitOut, setEthxitOut] = useState('');
  const [ethxitQuoting, setEthxitQuoting] = useState(false);
  const [ethxitSwapping, setEthxitSwapping] = useState(false);
  const [ethxitError, setEthxitError] = useState<string | null>(null);
  // ETH -> AE (bridge + swap) widget state
  const [ethBridgeIn, setEthBridgeIn] = useState('');
  const [ethBridgeOutAe, setEthBridgeOutAe] = useState('');
  const [ethBridgeQuoting, setEthBridgeQuoting] = useState(false);
  const [ethBridgeProcessing, setEthBridgeProcessing] = useState(false);
  const [ethBridgeError, setEthBridgeError] = useState<string | null>(null);
  const [ethBridgeStep, setEthBridgeStep] = useState<'idle'|'bridging'|'waiting'|'swapping'|'done'>('idle');

  const minReceivedText = useMemo(() => {
    if (!isExactIn || !tokenOut || !amountOut) return null;
    const min = fromAettos(subSlippage(toAettos(amountOut, tokenOut.decimals), slippagePct), tokenOut.decimals);
    return `${min} ${tokenOut.symbol}`;
  }, [isExactIn, amountOut, tokenOut, slippagePct]);

  const maxSoldText = useMemo(() => {
    if (isExactIn || !tokenIn || !amountIn) return null;
    const max = fromAettos(addSlippage(toAettos(amountIn, tokenIn.decimals), slippagePct), tokenIn.decimals);
    return `${max} ${tokenIn.symbol}`;
  }, [isExactIn, amountIn, tokenIn, slippagePct]);

  function routeLabel(addr: string): string {
    if (addr === DEX_ADDRESSES.wae) return 'WAE';
    if (tokenIn?.contractId === addr) return tokenIn.symbol;
    if (tokenOut?.contractId === addr) return tokenOut.symbol;
    const found = tokens.find((t) => t.contractId === addr);
    return found ? found.symbol : `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }

  function tokenDecimals(addr?: string): number {
    if (!addr) return 18;
    if (addr === DEX_ADDRESSES.wae) return 18;
    const t = tokens.find((x) => x.contractId === addr);
    return t?.decimals ?? 18;
  }

  function formatAmountHuman(amountStr: string): string {
    if (!amountStr) return '0';
    const [i, f] = amountStr.split('.');
    return f ? `${i}.${f.slice(0, 6)}` : i;
  }

  const filteredInTokens = useMemo(() => {
    const term = searchIn.trim().toLowerCase();
    const matches = (t: SelectToken) =>
      !term || t.symbol.toLowerCase().includes(term) || (t.contractId || '').toLowerCase().includes(term);
    const ae = tokens.find((t) => t.isAe);
    const wae = tokens.find((t) => t.contractId === DEX_ADDRESSES.wae);
    const rest = tokens.filter((t) => t !== ae && t !== wae).filter(matches);
    const out: SelectToken[] = [];
    if (ae && matches(ae)) out.push(ae);
    if (wae && matches(wae)) out.push(wae);
    out.push(...rest);
    return out;
  }, [tokens, searchIn]);

  const filteredOutTokens = useMemo(() => {
    const term = searchOut.trim().toLowerCase();
    const matches = (t: SelectToken) =>
      !term || t.symbol.toLowerCase().includes(term) || (t.contractId || '').toLowerCase().includes(term);
    const ae = tokens.find((t) => t.isAe);
    const wae = tokens.find((t) => t.contractId === DEX_ADDRESSES.wae);
    const rest = tokens.filter((t) => t !== ae && t !== wae).filter(matches);
    const out: SelectToken[] = [];
    if (ae && matches(ae)) out.push(ae);
    if (wae && matches(wae)) out.push(wae);
    out.push(...rest);
    return out;
  }, [tokens, searchOut]);

  useEffect(() => {
    // Initialize defaults
    if (!tokenIn && tokens.length) setTokenIn(tokens[0]);
    if (!tokenOut && tokens.length) setTokenOut(tokens[1] || null);
  }, [tokens, tokenIn, tokenOut]);

  // Prefill from query params (?from=ct_...|AE&to=ct_...|AE)
  useEffect(() => {
    try {
      if (!tokens.length) return;
      const qs = new URLSearchParams(location.search);
      const from = qs.get('from');
      const to = qs.get('to');
      if (from) {
        const f = from === 'AE'
          ? tokens.find((t) => (t as any).isAe)
          : tokens.find((t) => t.contractId === from);
        if (f) setTokenIn(f);
      }
      if (to) {
        const t = to === 'AE'
          ? tokens.find((t) => (t as any).isAe)
          : tokens.find((t) => t.contractId === to);
        if (t) setTokenOut(t);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, location.search]);

  async function ensureWallet() {
    // eslint-disable-next-line no-console
    console.info('[dex] Ensuring wallet is connected…');
    await dispatch(initSdk());
    if (!address) {
      // eslint-disable-next-line no-console
      console.info('[dex] No address set, scanning for wallets…');
      await dispatch(scanForWallets());
    }
    // eslint-disable-next-line no-console
    console.info('[dex] Wallet ensure complete');
  }

  async function buildBestPath(): Promise<string[] | null> {
    try {
      const sdk = (window as any).__aeSdk;
      if (!tokenIn || !tokenOut) return null;
      const tokenInAddr = tokenIn.isAe ? DEX_ADDRESSES.wae : tokenIn.contractId;
      const tokenOutAddr = tokenOut.isAe ? DEX_ADDRESSES.wae : tokenOut.contractId;
      if (!tokenInAddr || !tokenOutAddr) return null;
      // eslint-disable-next-line no-console
      console.info('[dex] Building best path', { from: tokenIn.symbol, to: tokenOut.symbol, fromAddr: tokenInAddr, toAddr: tokenOutAddr });
      // Prefer dex-backend route discovery
      try {
        const { getSwapRoutes } = await import('../libs/dexBackend');
        // eslint-disable-next-line no-console
        console.info('[dex] Querying dex-backend for routes…');
        const routes = await getSwapRoutes(tokenInAddr, tokenOutAddr);
        setRoutesFromBackend(routes || null);
        const first = routes?.[0];
        if (first && first.length >= 1) {
          const hops = [tokenInAddr];
          for (const pair of first) {
            const last = hops[hops.length - 1];
            const next = pair.token0 === last ? pair.token1 : pair.token1 === last ? pair.token0 : null;
            if (!next) break;
            hops.push(next);
          }
          if (hops[hops.length - 1] === tokenOutAddr) {
            // eslint-disable-next-line no-console
            console.info('[dex] Route found via backend', { hops });
            return hops;
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[dex] Backend route discovery failed, falling back to on-chain', e);
      }
      // Fallback via contracts
      if (!sdk) return null;
      const { factory } = await initDexContracts(sdk);
      const direct = await fetchPairReserves(sdk, factory, tokenInAddr, tokenOutAddr);
      if (direct) {
        // eslint-disable-next-line no-console
        console.info('[dex] Direct pair found');
        return [tokenInAddr, tokenOutAddr];
      }
      if (tokenInAddr !== DEX_ADDRESSES.wae && tokenOutAddr !== DEX_ADDRESSES.wae) {
        const legA = await fetchPairReserves(sdk, factory, tokenInAddr, DEX_ADDRESSES.wae);
        const legB = await fetchPairReserves(sdk, factory, DEX_ADDRESSES.wae, tokenOutAddr);
        if (legA && legB) {
          // eslint-disable-next-line no-console
          console.info('[dex] Two-leg route via WAE found');
          return [tokenInAddr, DEX_ADDRESSES.wae, tokenOutAddr];
        }
      }
      // eslint-disable-next-line no-console
      console.info('[dex] No route found');
      return null;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[dex] Failed to build path', e);
      return null;
    }
  }

  async function refreshQuote() {
    setError(null);
    const drivingAmount = isExactIn ? amountIn : amountOut;
    if (!drivingAmount || Number(drivingAmount) <= 0 || !tokenIn || !tokenOut) return;
    const seq = ++quoteSeqRef.current;
    setQuoteLoading(true);
    try {
      // eslint-disable-next-line no-console
      console.info('[dex] Quoting amount out…', { amountIn, tokenIn: tokenIn.symbol, tokenOut: tokenOut.symbol });
      const sdk = (window as any).__aeSdk;
      const { router } = await initDexContracts(sdk);
      const p = await buildBestPath();
      if (!p) throw new Error('No route found');
      setPath(p);
      if (isExactIn) {
        // AE side uses WAE in path for quoting
        const amountInAettos = toAettos(amountIn, tokenIn.decimals);
        const { decodedResult } = await (router as any).get_amounts_out(amountInAettos, p);
        const outAettos = decodedResult[decodedResult.length - 1];
        const out = fromAettos(outAettos, tokenOut.decimals);
        if (seq === quoteSeqRef.current) setAmountOut(out);
      } else {
        const amountOutAettos = toAettos(amountOut, tokenOut.decimals);
        const { decodedResult } = await (router as any).get_amounts_in(amountOutAettos, p);
        const inAettos = decodedResult[0];
        const inn = fromAettos(inAettos, tokenIn.decimals);
        if (seq === quoteSeqRef.current) setAmountIn(inn);
      }
      // Compute price impact when backend provided reserves
      try {
        const route = routesFromBackend?.[0];
        if (route && route.length >= 1) {
          const amountInAettosNum = toAettos(amountIn, tokenIn.decimals);
          const pi = getPriceImpactForRoute(route as any, p[0], amountInAettosNum);
          if (seq === quoteSeqRef.current) setPriceImpactPct(pi);
        } else {
          if (seq === quoteSeqRef.current) setPriceImpactPct(null);
        }
      } catch { if (seq === quoteSeqRef.current) setPriceImpactPct(null); }
      // eslint-disable-next-line no-console
      console.info('[dex] Quote result', { path: p, amountIn, amountOut });
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.warn('[dex] Quote failed', e);
      if (seq === quoteSeqRef.current) setError(errorToUserMessage(e, { action: 'quote' }));
    } finally {
      if (seq === quoteSeqRef.current) setQuoteLoading(false);
    }
  }

  // Quote for exact-in mode when amountIn or tokens change
  useEffect(() => {
    if (!isExactIn) return;
    if (quoteTimerRef.current) window.clearTimeout(quoteTimerRef.current);
    quoteTimerRef.current = window.setTimeout(() => { void refreshQuote(); }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExactIn, amountIn, tokenIn, tokenOut]);
  // Quote for exact-out mode when amountOut or tokens change
  useEffect(() => {
    if (isExactIn) return;
    if (quoteTimerRef.current) window.clearTimeout(quoteTimerRef.current);
    quoteTimerRef.current = window.setTimeout(() => { void refreshQuote(); }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExactIn, amountOut, tokenIn, tokenOut]);

  // Load balances when token selection or address changes
  useEffect(() => {
    (async () => {
      try {
        const sdk = (window as any).__aeSdk;
        if (!sdk || !address) return;
        const inAddr = tokenIn?.isAe ? 'AE' : tokenIn?.contractId;
        const outAddr = tokenOut?.isAe ? 'AE' : tokenOut?.contractId;
        if (!inAddr && !outAddr) return;
        const [bin, bout] = await Promise.all([
          inAddr ? getTokenBalance(sdk, inAddr as any, address) : Promise.resolve(null),
          outAddr ? getTokenBalance(sdk, outAddr as any, address) : Promise.resolve(null),
        ]);
        setBalances({
          in: bin != null ? fromAettos(bin as any, tokenIn?.decimals || 18) : undefined,
          out: bout != null ? fromAettos(bout as any, tokenOut?.decimals || 18) : undefined,
        });
      } catch {}
    })();
  }, [address, tokenIn, tokenOut]);

  // Load AE/WAE balances for wrap box
  async function refreshWrapBalances() {
    try {
      const sdk = (window as any).__aeSdk;
      if (!sdk || !address) return;
      const [aeBal, waeBal] = await Promise.all([
        getTokenBalance(sdk, 'AE', address),
        getTokenBalance(sdk, DEX_ADDRESSES.wae, address),
      ]);
      setWrapBalances({
        ae: fromAettos(aeBal, 18),
        wae: fromAettos(waeBal, 18),
      });
    } catch {}
  }
  useEffect(() => { void refreshWrapBalances(); }, [address]);

  // Automated ETHXIT quoting
  useEffect(() => {
    if (!ethxitIn || Number(ethxitIn) <= 0) {
      setEthxitOut('');
      return;
    }
    
    const timer = setTimeout(async () => {
      try {
        setEthxitQuoting(true);
        setEthxitError(null);
        const sdk = (window as any).__aeSdk;
        if (!sdk) return;
        const { router } = await initDexContracts(sdk);
        const ain = toAettos(ethxitIn || '0', 18);
        const path = [DEX_ADDRESSES.aeeth, DEX_ADDRESSES.wae];
        const { decodedResult } = await (router as any).get_amounts_out(ain, path);
        const out = decodedResult[decodedResult.length - 1];
        setEthxitOut(fromAettos(out, 18));
      } catch (e: any) {
        setEthxitError(errorToUserMessage(e, { action: 'quote' }));
      } finally {
        setEthxitQuoting(false);
      }
    }, 300); // 300ms delay to avoid too many requests

    return () => clearTimeout(timer);
  }, [ethxitIn]);

  // Automated ETH Bridge quoting
  useEffect(() => {
    if (!ethBridgeIn || Number(ethBridgeIn) <= 0) {
      setEthBridgeOutAe('');
      return;
    }
    
    const timer = setTimeout(async () => {
      try {
        setEthBridgeQuoting(true);
        setEthBridgeError(null);
        const sdk = (window as any).__aeSdk;
        if (!sdk) return;
        const { router } = await initDexContracts(sdk);
        const ain = toAettos(ethBridgeIn || '0', 18);
        const path = [DEX_ADDRESSES.aeeth, DEX_ADDRESSES.wae];
        const { decodedResult } = await (router as any).get_amounts_out(ain, path);
        const out = decodedResult[decodedResult.length - 1];
        // Out is WAE; 1:1 unwrap to AE
        setEthBridgeOutAe(fromAettos(out, 18));
      } catch (e: any) {
        setEthBridgeError(errorToUserMessage(e, { action: 'quote' }));
      } finally {
        setEthBridgeQuoting(false);
      }
    }, 300); // 300ms delay to avoid too many requests

    return () => clearTimeout(timer);
  }, [ethBridgeIn]);

  // Settings are sourced from dex slice and persisted there via DexSettings

  async function approveIfNeeded(amountAettos: bigint) {
    if (!tokenIn || tokenIn.isAe) return; // AE does not need allowance
    const sdk = (window as any).__aeSdk;
    // eslint-disable-next-line no-console
    console.info('[dex] Ensuring allowance for router…', { token: tokenIn.contractId, amount: amountAettos.toString() });
    await ensureAllowanceForRouter(sdk, tokenIn.contractId, address as string, amountAettos);
    try {
      const current = await getRouterTokenAllowance(sdk, tokenIn.contractId, address as string);
      setAllowanceInfo(`Allowance: ${fromAettos(current, tokenIn.decimals)} ${tokenIn.symbol}`);
    } catch {}
  }

  async function executeSwap() {
    setLoading(true);
    setError(null);
    try {
      // eslint-disable-next-line no-console
      console.info('[dex] Submitting swap…');
      await ensureWallet();
      const sdk = (window as any).__aeSdk;
      const { router } = await initDexContracts(sdk);
      const p = path.length ? path : await buildBestPath();
      if (!p) throw new Error('No route found');
      const amountInAettos = toAettos(amountIn || '0', tokenIn?.decimals || 18);
      const amountOutAettos = toAettos(amountOut || '0', tokenOut?.decimals || 18);
      const minOutAettos = subSlippage(amountOutAettos, slippagePct);
      // Approve when tokenIn is an AEX9 for exact-in, or when maxIn for exact-out
      if (isExactIn) {
        await approveIfNeeded(amountInAettos);
      }

      // Router expects deadline in milliseconds since epoch (same as dex-ui)
      const deadline = BigInt(Date.now() + Math.max(1, Math.min(60, deadlineMins)) * 60_000);
      const toAccount = (address as string).replace('ak_', 'ak_');

      // Choose method based on AE involvement
      const isInAe = !!tokenIn?.isAe;
      const isOutAe = !!tokenOut?.isAe;

      let txHash: string | undefined;
      if (!isInAe && !isOutAe) {
        // eslint-disable-next-line no-console
        if (isExactIn) {
          console.info('[dex] swap_exact_tokens_for_tokens', { amountInAettos: amountInAettos.toString(), minOutAettos: minOutAettos.toString(), path: p, toAccount, deadline: deadline.toString() });
          const res = await (router as any).swap_exact_tokens_for_tokens(
            amountInAettos,
            minOutAettos,
            p,
            toAccount,
            deadline,
            null,
          );
          txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
        } else {
          const { decodedResult } = await (router as any).get_amounts_in(amountOutAettos, p);
          const inNeeded = decodedResult[0] as bigint;
          const maxIn = (BigInt(addSlippage(inNeeded, slippagePct).toString()));
          await approveIfNeeded(maxIn);
          console.info('[dex] swap_tokens_for_exact_tokens', { amountOutAettos: amountOutAettos.toString(), maxIn: maxIn.toString(), path: p, toAccount, deadline: deadline.toString() });
          const res = await (router as any).swap_tokens_for_exact_tokens(
            amountOutAettos,
            maxIn,
            p,
            toAccount,
            deadline,
            null,
          );
          txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
        }
      } else if (isInAe && !isOutAe) {
        // eslint-disable-next-line no-console
        if (isExactIn) {
          console.info('[dex] swap_exact_ae_for_tokens', { minOutAettos: minOutAettos.toString(), path: p, toAccount, deadline: deadline.toString(), amountInAettos: amountInAettos.toString() });
          const res = await (router as any).swap_exact_ae_for_tokens(
            minOutAettos,
            p,
            toAccount,
            deadline,
            null,
            { amount: amountInAettos },
          );
          txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
        } else {
          const { decodedResult } = await (router as any).get_amounts_in(amountOutAettos, p);
          const inNeeded = decodedResult[0] as bigint;
          const maxAe = addSlippage(inNeeded, slippagePct).toString();
          console.info('[dex] swap_ae_for_exact_tokens', { amountOutAettos: amountOutAettos.toString(), maxAe, path: p, toAccount, deadline: deadline.toString() });
          const res = await (router as any).swap_ae_for_exact_tokens(
            amountOutAettos,
            p,
            toAccount,
            deadline,
            null,
            { amount: maxAe },
          );
          txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
        }
      } else if (!isInAe && isOutAe) {
        // eslint-disable-next-line no-console
        if (isExactIn) {
          console.info('[dex] swap_exact_tokens_for_ae', { amountInAettos: amountInAettos.toString(), minOutAettos: minOutAettos.toString(), path: p, toAccount, deadline: deadline.toString() });
          const res = await (router as any).swap_exact_tokens_for_ae(
            amountInAettos,
            minOutAettos,
            p,
            toAccount,
            deadline,
            null,
          );
          txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
        } else {
          const { decodedResult } = await (router as any).get_amounts_in(amountOutAettos, p);
          const inNeeded = decodedResult[0] as bigint;
          const maxIn = addSlippage(inNeeded, slippagePct);
          await approveIfNeeded(maxIn);
          console.info('[dex] swap_tokens_for_exact_ae', { amountOutAettos: amountOutAettos.toString(), maxIn: maxIn.toString(), path: p, toAccount, deadline: deadline.toString() });
          const res = await (router as any).swap_tokens_for_exact_ae(
            amountOutAettos,
            maxIn,
            p,
            toAccount,
            deadline,
            null,
          );
          txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
        }
      } else {
        // AE -> AE routed via WAE is a no-op; prevent
        throw new Error('Invalid route: AE to AE');
      }

      setAmountIn('');
      setAmountOut('');
      setShowConfirm(false);
      // eslint-disable-next-line no-console
      console.info('[dex] Swap submitted', { txHash });
      try {
        const url = CONFIG.EXPLORER_URL ? `${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${txHash || ''}` : '';
        toast.push(
          <div>
            <div>Swap submitted</div>
            {txHash && CONFIG.EXPLORER_URL && (
              <a href={url} target="_blank" rel="noreferrer" style={{ color: '#8bc9ff', textDecoration: 'underline' }}>View on explorer</a>
            )}
          </div>
        );
        setRecent((r) => [{ type: 'swap' as const, hash: txHash }, ...r].slice(0, 5));
      } catch {}
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.warn('[dex] Swap failed', e);
      setError(errorToUserMessage(e, { action: 'swap', slippagePct, deadlineMins }));
      try {
        const msg = errorToUserMessage(e, { action: 'swap', slippagePct, deadlineMins });
        toast.push(<div><div>Swap failed</div><div style={{ opacity: 0.9 }}>{msg}</div></div>);
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  async function wrapAeToWae(amountAe: string) {
    try {
      setWrapping(true);
      setError(null);
      await ensureWallet();
      const sdk = (window as any).__aeSdk;
      const wae = await sdk.initializeContract({ aci: WaeAci, address: DEX_ADDRESSES.wae });
      const aettos = toAettos(amountAe || '0', 18).toString();
      await wae.deposit({ amount: aettos });
      setWrapAmount('');
      void refreshWrapBalances();
    } catch (e: any) {
      setError(errorToUserMessage(e, { action: 'wrap' }));
    } finally {
      setWrapping(false);
    }
  }

  async function unwrapWaeToAe(amountWae: string) {
    try {
      setWrapping(true);
      setError(null);
      await ensureWallet();
      const sdk = (window as any).__aeSdk;
      const wae = await sdk.initializeContract({ aci: WaeAci, address: DEX_ADDRESSES.wae });
      const aettos = toAettos(amountWae || '0', 18);
      await wae.withdraw(aettos, null);
      setWrapAmount('');
      void refreshWrapBalances();
    } catch (e: any) {
      setError(errorToUserMessage(e, { action: 'unwrap' }));
    } finally {
      setWrapping(false);
    }
  }

  async function waitForAeEthDeposit(prevAeEth: bigint, expectedIncrease: bigint, timeoutMs = 300_000, pollMs = 6000): Promise<boolean> {
    const sdk = (window as any).__aeSdk;
    const started = Date.now();
    // eslint-disable-next-line no-console
    console.info('[dex] Waiting for æETH deposit…', { expectedIncrease: expectedIncrease.toString() });
    while (Date.now() - started < timeoutMs) {
      try {
        const now = await getTokenBalance(sdk, DEX_ADDRESSES.aeeth, address as string);
        // eslint-disable-next-line no-console
        console.info('[dex] æETH balance check', { prevAeEth: prevAeEth.toString(), now: now.toString() });
        if (now >= prevAeEth + expectedIncrease) return true;
      } catch {}
      await new Promise((r) => setTimeout(r, pollMs));
    }
    return false;
  }

  async function submitSwap() {
    setShowConfirm(true);
  }

  return (
    <div className="dex-container">
      <DexTabs />
      <div className="dex-header">
        <h2 className="dex-title">Superhero DEX</h2>
        <p className="dex-description">
          Trade any supported AEX-9 tokens on æternity via the AMM. Routes may hop through WAE. Tokens (non-AE) require a one-time allowance. Swaps are non-custodial and executed on-chain.{' '}
          <a href="https://aepp.dex.superhero.com" target="_blank" rel="noreferrer" className="dex-link">Learn more</a>
        </p>
      </div>

      <div style={{ display: 'grid', gap: 10, border: '1px solid #3a3a4a', padding: 12, borderRadius: 12, background: '#14141c' }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label style={{ fontSize: 12, opacity: 0.85 }}>From</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <input
                aria-label="search-token-in"
                placeholder="Search token"
                value={searchIn}
                onChange={(e) => setSearchIn(e.target.value)}
                style={{ width: 160, padding: '6px 8px', borderRadius: 8, background: '#1a1a23', color: 'white', border: '1px solid #3a3a4a' }}
              />
            <select
              value={tokenIn?.contractId || ''}
              onChange={(e) => {
                const next = tokens.find((t) => t.contractId === (e.target.value || '')) || null;
                setTokenIn(next);
                // eslint-disable-next-line no-console
                console.info('[dex] Selected tokenIn', { contractId: next?.contractId, symbol: next?.symbol });
              }}
              style={{ flex: '0 0 160px', padding: '8px 10px', borderRadius: 8, background: '#1a1a23', color: 'white', border: '1px solid #3a3a4a' }}
            >
              {filteredInTokens.map((t) => (
                <option key={t.contractId} value={t.contractId}>{t.symbol}</option>
              ))}
            </select>
            </div>
            <div style={{ 
              flex: 1, 
              padding: '8px 10px', 
              borderRadius: 8, 
              background: '#1a1a23', 
              color: 'white', 
              border: '1px solid #3a3a4a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <input
                id="dex-amount-in"
                name="amountIn"
                type="text"
                inputMode="decimal"
                placeholder="0.0"
                value={amountIn}
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, '.');
                  const decs = tokenIn?.decimals ?? 18;
                  const m = raw.match(/^\d*(?:\.(\d*)?)?$/);
                  if (!m) return; // block invalid chars
                  const frac = m[1] || '';
                  const trimmed = frac.length > decs ? `${raw.split('.')[0]}.${frac.slice(0, decs)}` : raw;
                  if (trimmed.startsWith('.')) return; // disallow leading dot
                  setAmountIn(trimmed);
                }}
                style={{ 
                  flex: 1, 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'white',
                  outline: 'none',
                  fontSize: '14px'
                }}
                aria-label="amount-in"
              />
              {tokenIn && (
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 500 }}>
                  {tokenIn.symbol}
                </span>
              )}
            </div>
            {balances.in && (
              <div style={{ alignSelf: 'center', fontSize: 12, opacity: 0.8 }}>Balance: {balances.in}</div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', opacity: 0.8 }}>↓</div>

        <div style={{ display: 'grid', gap: 6 }}>
          <label style={{ fontSize: 12, opacity: 0.85 }}>To</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <input
                aria-label="search-token-out"
                placeholder="Search token"
                value={searchOut}
                onChange={(e) => setSearchOut(e.target.value)}
                style={{ width: 160, padding: '6px 8px', borderRadius: 8, background: '#1a1a23', color: 'white', border: '1px solid #3a3a4a' }}
              />
            <select
              value={tokenOut?.contractId || ''}
              onChange={(e) => {
                const next = tokens.find((t) => t.contractId === (e.target.value || '')) || null;
                setTokenOut(next);
                // eslint-disable-next-line no-console
                console.info('[dex] Selected tokenOut', { contractId: next?.contractId, symbol: next?.symbol });
              }}
              style={{ flex: '0 0 160px', padding: '8px 10px', borderRadius: 8, background: '#1a1a23', color: 'white', border: '1px solid #3a3a4a' }}
            >
              {filteredOutTokens.map((t) => (
                <option key={t.contractId} value={t.contractId}>{t.symbol}</option>
              ))}
            </select>
            </div>
            <div style={{ 
              flex: 1, 
              padding: '8px 10px', 
              borderRadius: 8, 
              background: '#1a1a23', 
              color: 'white', 
              border: '1px solid #3a3a4a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <input
                id="dex-amount-out"
                name="amountOut"
                type="text"
                readOnly={isExactIn}
                onChange={(e) => {
                  const raw = e.target.value.replace(/,/g, '.');
                  const decs = tokenOut?.decimals ?? 18;
                  const m = raw.match(/^\d*(?:\.(\d*)?)?$/);
                  if (!m) return;
                  const frac = m[1] || '';
                  const trimmed = frac.length > decs ? `${raw.split('.')[0]}.${frac.slice(0, decs)}` : raw;
                  if (trimmed.startsWith('.')) return;
                  setIsExactIn(false);
                  setAmountOut(trimmed);
                }}
                value={quoteLoading ? 'Quoting…' : amountOut}
                placeholder="0.0"
                style={{ 
                  flex: 1, 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'white',
                  outline: 'none',
                  fontSize: '14px'
                }}
                aria-label="amount-out"
              />
              {tokenOut && (
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 500 }}>
                  {tokenOut.symbol}
                </span>
              )}
            </div>
            {balances.out && (
              <div style={{ alignSelf: 'center', fontSize: 12, opacity: 0.8 }}>Balance: {balances.out}</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 12, opacity: 0.85 }}>
          <label htmlFor="dex-exact-out" title="Switch to exact output (max sold will be calculated)">Exact output</label>
          <input id="dex-exact-out" type="checkbox" checked={!isExactIn} onChange={(e) => setIsExactIn(!e.target.checked)} />
          <div style={{ marginLeft: 'auto' }}>
            {isExactIn && amountOut && tokenOut ? (
              <span>Min received: {fromAettos(subSlippage(toAettos(amountOut, tokenOut.decimals), slippagePct), tokenOut.decimals)} {tokenOut.symbol}</span>
            ) : (!isExactIn && amountIn && tokenIn) ? (
              <span>Max sold: {fromAettos(addSlippage(toAettos(amountIn, tokenIn.decimals), slippagePct), tokenIn.decimals)} {tokenIn.symbol}</span>
            ) : null}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8, fontSize: 12, opacity: 0.8, alignItems: 'center' }}>
            {priceImpactPct != null && (
              <div>Price impact: {priceImpactPct.toFixed(2)}%</div>
            )}
          </div>
          <button aria-label="open-settings" onClick={() => setShowSettings((v) => !v)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #3a3a4a', background: '#2a2a39', color: 'white' }}>Settings</button>
        </div>
        {showSettings && (<DexSettings />)}

        {routesFromBackend && !path.length && (
          <div style={{ fontSize: 12, opacity: 0.8 }}>Looking for best route…</div>
        )}
        {!!path.length && (
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Route: {path.map((p, i) => (i > 0 ? ' → ' : '') + routeLabel(p)).join('')}
            {routesFromBackend?.[0] && (
              <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                {routesFromBackend[0].map((pair: any, idx: number) => {
                  const t0 = String(pair.token0);
                  const t1 = String(pair.token1);
                  const r0 = pair?.liquidityInfo?.reserve0 ?? pair?.reserve0;
                  const r1 = pair?.liquidityInfo?.reserve1 ?? pair?.reserve1;
                  const d0 = tokenDecimals(t0);
                  const d1 = tokenDecimals(t1);
                  const hr0 = r0 != null ? formatAmountHuman(fromAettos(BigInt(r0), d0)) : null;
                  const hr1 = r1 != null ? formatAmountHuman(fromAettos(BigInt(r1), d1)) : null;
                  return (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span>{routeLabel(t0)} / {routeLabel(t1)}</span>
                      <span style={{ opacity: 0.8 }}>
                        Reserves: {hr0 && hr1 ? `${hr0} / ${hr1}` : 'N/A'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {allowanceInfo && !tokenIn?.isAe && (
          <div style={{ fontSize: 12, opacity: 0.8 }}>{allowanceInfo}</div>
        )}
        {error && <div style={{ color: '#ff6b6b', fontSize: 13 }}>{error}</div>}

        {address ? (
          <button
            onClick={submitSwap}
            disabled={loading || !amountIn || Number(amountIn) <= 0 || !amountOut || !tokenIn || !tokenOut}
            style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #3a3a4a', background: '#2a2a39', color: 'white' }}
          >
            {loading ? 'Confirm in wallet…' : 'Swap'}
          </button>
        ) : (
          <ConnectWalletButton 
            label="Connect Wallet & Swap"
            block
            style={{ 
              padding: '10px 12px', 
              borderRadius: 10, 
              border: '1px solid #3a3a4a', 
              background: '#2a2a39', 
              color: 'white' 
            }}
          />
        )}

      </div>

      {/* ETHXIT mini widget */}
      <div style={{ marginTop: 16, border: '1px solid #3a3a4a', borderRadius: 12, background: '#14141c', padding: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 600, color: 'white' }}>Convert aeETH to AE</h3>
          <p style={{ margin: 0, fontSize: 14, opacity: 0.8, lineHeight: 1.4 }}>
            First bridge ETH → aeETH, then swap aeETH → AE
          </p>
        </div>

        {!address && (
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <ConnectWalletButton 
              label="Connect Wallet"
              block
              style={{ 
                padding: '12px 24px', 
                borderRadius: 12, 
                border: 'none', 
                background: '#4caf50', 
                color: 'white', 
                fontSize: 16, 
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
            />
          </div>
        )}
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <label style={{ fontSize: 12, opacity: 0.85 }}>From (aeETH)</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ 
                flex: 1, 
                padding: '8px 10px', 
                borderRadius: 8, 
                background: '#1a1a23', 
                color: 'white', 
                border: '1px solid #3a3a4a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <input
                  aria-label="ethxit-amount-in"
                  placeholder="0.0"
                  value={ethxitIn}
                  onChange={(e) => setEthxitIn(e.target.value)}
                  style={{ 
                    flex: 1, 
                    background: 'transparent', 
                    border: 'none', 
                    color: 'white',
                    outline: 'none',
                    fontSize: '14px'
                  }}
                />
                <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 500 }}>aeETH</span>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', opacity: 0.8 }}>↓</div>
          <div style={{ display: 'grid', gap: 6 }}>
            <label style={{ fontSize: 12, opacity: 0.85 }}>To (AE)</label>
            <div style={{ 
              padding: '8px 10px', 
              borderRadius: 8, 
              background: '#1a1a23', 
              color: 'white', 
              border: '1px solid #3a3a4a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ color: 'white', fontSize: '14px' }}>
                {ethxitQuoting ? 'Quoting…' : (ethxitOut || '0.0')}
              </span>
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 500 }}>AE</span>
            </div>
          </div>
          {ethxitError && <div style={{ color: '#ff6b6b', fontSize: 13 }}>{ethxitError}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={async () => {
                try {
                  setEthxitSwapping(true); setEthxitError(null);
                  const sdk = (window as any).__aeSdk;
                  const { router } = await initDexContracts(sdk);
                  const toAccount = (address as string);
                  const path = [DEX_ADDRESSES.aeeth, DEX_ADDRESSES.wae];
                  const ain = toAettos(ethxitIn || '0', 18);
                  // ensure allowance for aeETH
                  await ensureAllowanceForRouter(sdk, DEX_ADDRESSES.aeeth, toAccount, ain);
                  const { decodedResult } = await (router as any).get_amounts_out(ain, path);
                  const out = BigInt(decodedResult[decodedResult.length - 1]);
                  const minOut = subSlippage(out, slippagePct);
                  const deadline = BigInt(Date.now() + Math.max(1, Math.min(60, deadlineMins)) * 60_000);
                  const res = await (router as any).swap_exact_tokens_for_ae(
                    ain,
                    minOut,
                    path,
                    toAccount,
                    deadline,
                    null,
                  );
                  setEthxitIn(''); setEthxitOut('');
                  const txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
                  try {
                    const url = CONFIG.EXPLORER_URL ? `${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${txHash || ''}` : '';
                    toast.push(
                      <div>
                        <div>ETHXIT swap submitted</div>
                        {txHash && CONFIG.EXPLORER_URL && (
                          <a href={url} target="_blank" rel="noreferrer" style={{ color: '#8bc9ff', textDecoration: 'underline' }}>View on explorer</a>
                        )}
                      </div>
                    );
                    setRecent((r) => [{ type: 'swap' as const, hash: txHash }, ...r].slice(0, 5));
                  } catch {}
                } catch (e: any) {
                  setEthxitError(errorToUserMessage(e, { action: 'swap', slippagePct, deadlineMins }));
                } finally { setEthxitSwapping(false); }
              }}
              disabled={ethxitSwapping || !address || !ethxitIn || Number(ethxitIn) <= 0}
              style={{ 
                padding: '8px 10px', 
                borderRadius: 8, 
                border: '1px solid #3a3a4a', 
                background: address ? '#4caf50' : '#2a2a39', 
                color: 'white', 
                flex: 1,
                fontWeight: address ? 600 : 400,
                transition: 'background-color 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (address) e.currentTarget.style.background = '#45a049';
              }}
              onMouseOut={(e) => {
                if (address) e.currentTarget.style.background = '#4caf50';
              }}
            >{ethxitSwapping ? 'Swapping…' : (address ? 'Swap' : 'Connect Wallet')}</button>
          </div>

          {/* Slippage setting */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, opacity: 0.85 }}>
            <span>Slippage:</span>
            <input
              type="number"
              min="0.1"
              max="50"
              step="0.1"
              value={slippagePct}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                if (!isNaN(value) && value >= 0.1 && value <= 50) {
                  // Update slippage in the store
                  dispatch(setSlippage(value));
                }
              }}
              style={{ 
                width: 60, 
                padding: '4px 8px', 
                borderRadius: 6, 
                background: '#1a1a23', 
                color: 'white', 
                border: '1px solid #3a3a4a',
                fontSize: 12
              }}
            />
            <span>%</span>
          </div>
        </div>

        {/* Hint section */}
        <div style={{ marginTop: 16, padding: 12, background: 'rgba(255, 255, 255, 0.02)', borderRadius: 8, border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16 }}>💡</span>
            <span style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.8)' }}>Need to bridge ETH first?</span>
          </div>
          <a 
            href="https://aepp.dex.superhero.com" 
            target="_blank" 
            rel="noreferrer"
            style={{ 
              color: '#4caf50', 
              textDecoration: 'none', 
              fontSize: 14,
              fontWeight: 500
            }}
            onMouseOver={(e) => e.currentTarget.style.textDecoration = 'underline'}
            onMouseOut={(e) => e.currentTarget.style.textDecoration = 'none'}
          >
            Visit Superhero Swap
          </a>
        </div>
      </div>


      {/* Wrap / Unwrap dedicated box */}
      <div style={{ marginTop: 16, border: '1px solid #3a3a4a', borderRadius: 12, background: '#14141c', padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700 }}>Wrap / Unwrap AE ↔ WAE</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>AE: {wrapBalances.ae ?? '…'} | WAE: {wrapBalances.wae ?? '…'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            aria-label="wrap-amount"
            placeholder="0.0"
            type="number"
            min="0"
            step="any"
            value={wrapAmount}
            onChange={(e) => setWrapAmount(e.target.value)}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, background: '#1a1a23', color: 'white', border: '1px solid #3a3a4a' }}
          />
          <button onClick={() => void wrapAeToWae(wrapAmount || '0')} disabled={wrapping || !wrapAmount || Number(wrapAmount) <= 0} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #3a3a4a', background: '#2a2a39', color: 'white' }}>{wrapping ? 'Wrapping…' : 'Wrap AE→WAE'}</button>
          <button onClick={() => void unwrapWaeToAe(wrapAmount || '0')} disabled={wrapping || !wrapAmount || Number(wrapAmount) <= 0} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #3a3a4a', background: '#2a2a39', color: 'white' }}>{wrapping ? 'Unwrapping…' : 'Unwrap WAE→AE'}</button>
        </div>

        {tokensLoading && <div style={{ fontSize: 12, opacity: 0.8 }}>Loading tokens…</div>}
      </div>

      {!!recent.length && (
        <div style={{ marginTop: 16, border: '1px solid #3a3a4a', borderRadius: 12, background: '#14141c', padding: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Recent activity</div>
          <div style={{ display: 'grid', gap: 6, fontSize: 12 }}>
            {recent.map((e, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{e.type}</span>
                {e.hash && CONFIG.EXPLORER_URL && (
                  <a href={`${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${e.hash}`} target="_blank" rel="noreferrer" style={{ color: '#8bc9ff', textDecoration: 'underline' }}>View</a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ETH -> AE bridge + swap box (place at bottom) */}
      <div style={{ marginTop: 16, border: '1px solid #3a3a4a', borderRadius: 12, background: '#14141c', padding: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 700 }}>Bridge ETH → AE</div>
        </div>
        <p style={{ margin: '6px 0 10px', fontSize: 12, opacity: 0.8 }}>
          Sends native ETH on Ethereum to æternity as æETH, then swaps æETH → AE on-chain.
        </p>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <label style={{ fontSize: 12, opacity: 0.85 }}>From (ETH, Ethereum)</label>
            <div style={{ 
              padding: '8px 10px', 
              borderRadius: 8, 
              background: '#1a1a23', 
              color: 'white', 
              border: '1px solid #3a3a4a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <input
                aria-label="eth-bridge-amount-in"
                placeholder="0.0"
                value={ethBridgeIn}
                onChange={(e) => setEthBridgeIn(e.target.value)}
                style={{ 
                  flex: 1, 
                  background: 'transparent', 
                  border: 'none', 
                  color: 'white',
                  outline: 'none',
                  fontSize: '14px'
                }}
              />
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 500 }}>ETH</span>
            </div>
          </div>
          <div style={{ textAlign: 'center', opacity: 0.8 }}>↓</div>
          <div style={{ display: 'grid', gap: 6 }}>
            <label style={{ fontSize: 12, opacity: 0.85 }}>To (AE, aeternity)</label>
            <div style={{ 
              padding: '8px 10px', 
              borderRadius: 8, 
              background: '#1a1a23', 
              color: 'white', 
              border: '1px solid #3a3a4a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ color: 'white', fontSize: '14px' }}>
                {ethBridgeQuoting ? 'Quoting…' : (ethBridgeOutAe || '0.0')}
              </span>
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 500 }}>AE</span>
            </div>
          </div>
          {ethBridgeError && <div style={{ color: '#ff6b6b', fontSize: 13 }}>{ethBridgeError}</div>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={async () => {
                try {
                  setEthBridgeProcessing(true); setEthBridgeError(null); setEthBridgeStep('bridging');
                  await ensureWallet();
                  const sdk = (window as any).__aeSdk;
                  const toAccount = (address as string);
                  // Record pre-bridge aeETH balance
                  const prevAeEth = await getTokenBalance(sdk, DEX_ADDRESSES.aeeth, toAccount);
                  const amountEth = ethBridgeIn || '0';
                  // 1) Bridge ETH -> aeETH
                  await bridgeEthToAe({ amountEth, aeAccount: toAccount });
                  setEthBridgeStep('waiting');
                  const ain = toAettos(amountEth, 18);
                  const arrived = await waitForAeEthDeposit(prevAeEth, ain);
                  if (!arrived) throw new Error('Timed out waiting for bridged æETH');
                  // 2) Swap aeETH -> AE (via WAE path)
                  setEthBridgeStep('swapping');
                  const { router } = await initDexContracts(sdk);
                  const path = [DEX_ADDRESSES.aeeth, DEX_ADDRESSES.wae];
                  // ensure allowance for aeETH
                  await ensureAllowanceForRouter(sdk, DEX_ADDRESSES.aeeth, toAccount, ain);
                  const { decodedResult } = await (router as any).get_amounts_out(ain, path);
                  const out = BigInt(decodedResult[decodedResult.length - 1]);
                  const minOut = subSlippage(out, slippagePct);
                  const deadline = BigInt(Date.now() + Math.max(1, Math.min(60, deadlineMins)) * 60_000);
                  const res = await (router as any).swap_exact_tokens_for_ae(
                    ain,
                    minOut,
                    path,
                    toAccount,
                    deadline,
                    null,
                  );
                  const txHash = (res?.hash || res?.tx?.hash || res?.transactionHash || '').toString();
                  try {
                    const url = CONFIG.EXPLORER_URL ? `${CONFIG.EXPLORER_URL.replace(/\/$/, '')}/transactions/${txHash || ''}` : '';
                    toast.push(
                      <div>
                        <div>ETH→AE flow completed</div>
                        {txHash && CONFIG.EXPLORER_URL && (
                          <a href={url} target="_blank" rel="noreferrer" style={{ color: '#8bc9ff', textDecoration: 'underline' }}>View swap on explorer</a>
                        )}
                      </div>
                    );
                    setRecent((r) => [{ type: 'swap' as const, hash: txHash }, ...r].slice(0, 5));
                  } catch {}
                  setEthBridgeStep('done'); setEthBridgeIn(''); setEthBridgeOutAe('');
                } catch (e: any) {
                  setEthBridgeError(errorToUserMessage(e, { action: 'swap', slippagePct, deadlineMins }));
                  setEthBridgeStep('idle');
                } finally { setEthBridgeProcessing(false); }
              }}
              disabled={ethBridgeProcessing || !address || !ethBridgeIn || Number(ethBridgeIn) <= 0}
              style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #3a3a4a', background: '#2a2a39', color: 'white', flex: 1 }}
            >{ethBridgeProcessing ? (ethBridgeStep === 'bridging' ? 'Bridging…' : ethBridgeStep === 'waiting' ? 'Waiting for æETH…' : ethBridgeStep === 'swapping' ? 'Swapping…' : 'Processing…') : (address ? 'Bridge & Swap' : 'Connect wallets')}</button>
          </div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Status: {ethBridgeStep === 'idle' ? 'Idle' : ethBridgeStep === 'bridging' ? 'Bridging ETH → æETH on Ethereum' : ethBridgeStep === 'waiting' ? 'Waiting for æETH deposit on æternity' : ethBridgeStep === 'swapping' ? 'Swapping æETH → AE' : 'Done'}
          </div>
        </div>
      </div>


      {showConfirm && (
        <div role="dialog" aria-label="confirm-swap" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center' }}>
          <div style={{ background: '#14141c', color: 'white', border: '1px solid #3a3a4a', borderRadius: 10, padding: 16, width: 420 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Confirm Swap</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 12 }}>
              {amountIn || '0'} {tokenIn?.symbol} → {amountOut || '0'} {tokenOut?.symbol}
            </div>
            <div style={{ display: 'grid', gap: 6, fontSize: 12, opacity: 0.85, marginBottom: 12 }}>
              <div>Slippage: {slippagePct}%</div>
              <div>Rate: 1 {tokenIn?.symbol} ≈ {Number(amountOut || 0) / Math.max(Number(amountIn || 0) || 1, 1)} {tokenOut?.symbol}</div>
              {priceImpactPct != null && (
                <div style={{ color: priceImpactPct > 10 ? '#ff6b6b' : priceImpactPct > 5 ? '#ffb86b' : 'inherit' }}>
                  Price impact: {priceImpactPct.toFixed(2)}%
                </div>
              )}
              {isExactIn && minReceivedText && (
                <div>Minimum received: {minReceivedText}</div>
              )}
              {!isExactIn && maxSoldText && (
                <div>Maximum sold: {maxSoldText}</div>
              )}
              <div>Deadline: {deadlineMins} min</div>
              {!!path.length && <div>Route: {path.map((p, i) => (i > 0 ? ' → ' : '') + routeLabel(p)).join('')}</div>}
            </div>
            {priceImpactPct != null && priceImpactPct > 10 && (
              <div style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.12)', border: '1px solid #ff6b6b55', padding: 8, borderRadius: 6, fontSize: 12, marginBottom: 12 }}>
                High price impact. Consider reducing amount or choosing a different route.
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowConfirm(false)} style={{ padding: '8px 10px', borderRadius: 8 }}>Cancel</button>
              <button onClick={() => void executeSwap()} style={{ padding: '8px 10px', borderRadius: 8, flex: 1 }}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


