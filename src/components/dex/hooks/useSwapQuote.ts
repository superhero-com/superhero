import { useRef, useState } from 'react';
import { useAeSdk } from '../../../hooks';
import {
  DEX_ADDRESSES,
  fetchPairReserves,
  fromAettos,
  initDexContracts,
  toAettos
} from '../../../libs/dex';
import { errorToUserMessage } from '../../../libs/errorMessages';
import { getPriceImpactForRoute } from '../../../libs/swapUtils';
import { RouteInfo, SwapQuoteParams } from '../types/dex';

export function useSwapQuote() {
  const { sdk } = useAeSdk()
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo>({ path: [] });
  const quoteSeqRef = useRef(0);
  const quoteTimerRef = useRef<number | null>(null);

  async function buildBestPath(tokenIn: any, tokenOut: any): Promise<string[] | null> {
    try {
      if (!tokenIn || !tokenOut) return null;

      const tokenInAddr = tokenIn.isAe ? DEX_ADDRESSES.wae : tokenIn.contractId;
      const tokenOutAddr = tokenOut.isAe ? DEX_ADDRESSES.wae : tokenOut.contractId;

      if (!tokenInAddr || !tokenOutAddr) return null;

      // eslint-disable-next-line no-console
      console.info('[dex] Building best path', {
        from: tokenIn.symbol,
        to: tokenOut.symbol,
        fromAddr: tokenInAddr,
        toAddr: tokenOutAddr
      });

      // Prefer dex-backend route discovery
      try {
        const { getSwapRoutes } = await import('../../../libs/dexBackend');
        // eslint-disable-next-line no-console
        console.info('[dex] Querying dex-backend for routes…');
        const routes = await getSwapRoutes(tokenInAddr, tokenOutAddr);

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

  async function refreshQuote(params: SwapQuoteParams, onQuoteResult?: (result: { amountOut?: string; amountIn?: string; path: string[]; priceImpact?: number }) => void): Promise<{ amountOut?: string; amountIn?: string; path: string[]; priceImpact?: number }> {
    setError(null);
    const drivingAmount = params.isExactIn ? params.amountIn : params.amountOut;
    if (!drivingAmount || Number(drivingAmount) <= 0 || !params.tokenIn || !params.tokenOut) {
      return { path: [] };
    }

    const seq = ++quoteSeqRef.current;
    setQuoteLoading(true);

    try {
      // eslint-disable-next-line no-console
      console.info('[dex] Quoting amount out…', {
        amountIn: params.amountIn,
        tokenIn: params.tokenIn.symbol,
        tokenOut: params.tokenOut.symbol
      });

      const { router } = await initDexContracts(sdk);
      const p = await buildBestPath(params.tokenIn, params.tokenOut);

      if (!p) throw new Error('No route found');

      let amountOut: string | undefined;
      let amountIn: string | undefined;

      if (params.isExactIn) {
        // AE side uses WAE in path for quoting
        const amountInAettos = toAettos(params.amountIn, params.tokenIn.decimals);
        const { decodedResult } = await (router as any).get_amounts_out(amountInAettos, p);
        const outAettos = decodedResult[decodedResult.length - 1];
        amountOut = fromAettos(outAettos, params.tokenOut.decimals);
      } else {
        const amountOutAettos = toAettos(params.amountOut, params.tokenOut.decimals);
        const { decodedResult } = await (router as any).get_amounts_in(amountOutAettos, p);
        const inAettos = decodedResult[0];
        amountIn = fromAettos(inAettos, params.tokenIn.decimals);
      }

      // Compute price impact when backend provided reserves
      let priceImpact: number | undefined;
      try {
        const route = routeInfo.reserves;
        if (route && route.length >= 1) {
          const amountInAettosNum = toAettos(params.amountIn, params.tokenIn.decimals);
          priceImpact = getPriceImpactForRoute(route as any, p[0], amountInAettosNum);
        }
      } catch {
        priceImpact = undefined;
      }

      // eslint-disable-next-line no-console
      console.info('[dex] Quote result', { path: p, amountIn: params.amountIn, amountOut });

      if (seq === quoteSeqRef.current) {
        setRouteInfo({ path: p, priceImpact });
        onQuoteResult?.({ amountOut, amountIn, path: p, priceImpact });
      }

      return { amountOut, amountIn, path: p, priceImpact };
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.warn('[dex] Quote failed', e);
      if (seq === quoteSeqRef.current) {
        setError(errorToUserMessage(e, { action: 'quote' }));
      }
      return { path: [] };
    } finally {
      if (seq === quoteSeqRef.current) setQuoteLoading(false);
    }
  }

  const debouncedQuote = (params: SwapQuoteParams, onQuoteResult?: (result: { amountOut?: string; amountIn?: string; path: string[]; priceImpact?: number }) => void, delay = 300) => {
    if (quoteTimerRef.current) window.clearTimeout(quoteTimerRef.current);
    quoteTimerRef.current = window.setTimeout(() => {
      void refreshQuote(params, onQuoteResult);
    }, delay);
  };

  return {
    quoteLoading,
    error,
    routeInfo,
    refreshQuote,
    debouncedQuote,
    clearError: () => setError(null)
  };
}
