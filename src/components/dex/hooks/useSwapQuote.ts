/* eslint-disable */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { DexTokenDto } from '@/api/generated';
import { useAeSdk } from '../../../hooks';
import { CONFIG } from '../../../config';
import {
  fetchPairReserves,
  fromAettos,
  initDexContracts,
  toAettos,
} from '../../../libs/dex';
import { getSwapRoutes } from '../../../libs/dexBackend';
import { errorToUserMessage } from '../../../libs/errorMessages';
import {
  getPath,
  getPriceImpactForRoute,
  ratioFromRoute,
  ratioWithDecimals,
} from '../../../libs/swapUtils';
import { RouteInfo, SwapQuoteParams } from '../types/dex';
import { Decimal } from '../../../libs/decimal';

// Helper types
interface PairWithReserves {
  address: string;
  token0: { address: string; decimals: number };
  token1: { address: string; decimals: number };
  reserve0?: string;
  reserve1?: string;
}

export interface BackendRoutePair {
  address: string;
  token0: string;
  token1: string;
  synchronized?: boolean | string;
  liquidityInfo: {
    reserve0: string;
    reserve1: string;
    totalSupply?: string;
    height?: number | string;
  };
}

export interface LiquidityStatus {
  exceedsLiquidity: boolean;
  maxAvailable?: string;
  pairAddress?: string;
}

interface QuoteResult {
  amountOut?: string;
  amountIn?: string;
  path: string[];
  priceImpact?: number;
  maxOut?: string;
}

// Helper functions
function isAeToWae(tokenIn: DexTokenDto, tokenOut: DexTokenDto): boolean {
  const isAetoWae = tokenIn.address === 'AE' && tokenOut.address === CONFIG.DEX_WAE;
  const isWaeToAe = tokenIn.address === CONFIG.DEX_WAE && tokenOut.address === 'AE';
  return isAetoWae || isWaeToAe;
}

function getTokenAddress(token: DexTokenDto): string {
  return token.is_ae ? CONFIG.DEX_WAE : token.address;
}

export function getHumanPairRatio(
  pair: PairWithReserves,
  tokenInAddr: string,
  tokenOutAddr: string,
): Decimal | null {
  const isToken0ToToken1 = pair.token0.address === tokenInAddr && pair.token1.address === tokenOutAddr;
  const isToken1ToToken0 = pair.token1.address === tokenInAddr && pair.token0.address === tokenOutAddr;

  if (!isToken0ToToken1 && !isToken1ToToken0) {
    return null;
  }

  const reserveIn = isToken0ToToken1 ? pair.reserve0 : pair.reserve1;
  const reserveOut = isToken0ToToken1 ? pair.reserve1 : pair.reserve0;
  const decimalsIn = isToken0ToToken1 ? pair.token0.decimals : pair.token1.decimals;
  const decimalsOut = isToken0ToToken1 ? pair.token1.decimals : pair.token0.decimals;

  if (!reserveIn || !reserveOut) {
    return null;
  }

  try {
    const rawRatio = Decimal.from(reserveOut).div(reserveIn);
    const decimalAdjustment = Decimal.from(`1e${decimalsIn - decimalsOut}`);
    return rawRatio.mul(decimalAdjustment);
  } catch {
    return null;
  }
}

function sortTokens(tokenA: string, tokenB: string): [string, string] {
  return tokenA < tokenB ? [tokenA, tokenB] : [tokenB, tokenA];
}

function getHumanRouteRatio(
  route: BackendRoutePair[],
  tokenIn: DexTokenDto,
  tokenOut: DexTokenDto,
): Decimal | null {
  try {
    const rawRatio = ratioFromRoute(route as any, getTokenAddress(tokenIn)).toString();
    const normalizedRatio = ratioWithDecimals(rawRatio, {
      decimalsA: tokenIn.decimals,
      decimalsB: tokenOut.decimals,
    }).toString();
    return Decimal.from(normalizedRatio);
  } catch {
    return null;
  }
}

function calculateRouteAmount(
  params: SwapQuoteParams,
  route: BackendRoutePair[],
): {
  amountOut?: string;
  amountIn?: string;
} {
  if (!params.tokenIn || !params.tokenOut) {
    return {};
  }

  const humanRatio = getHumanRouteRatio(route, params.tokenIn, params.tokenOut);
  if (!humanRatio) {
    return {};
  }

  if (params.isExactIn) {
    return {
      amountOut: Decimal.from(params.amountIn).mul(humanRatio).toString(),
    };
  }

  return {
    amountIn: Decimal.from(params.amountOut).div(humanRatio).toString(),
  };
}

function getFirstRouteHop(
  route: BackendRoutePair[],
  path: string[],
): { pair: BackendRoutePair; reserveIn: string } | null {
  if (route.length === 0 || path.length < 2) {
    return null;
  }

  const [tokenInAddr, nextTokenAddr] = path;
  const firstPair = route.find(({ token0, token1 }) => (
    (token0 === tokenInAddr && token1 === nextTokenAddr)
    || (token1 === tokenInAddr && token0 === nextTokenAddr)
  ));

  if (!firstPair) {
    return null;
  }

  return {
    pair: firstPair,
    reserveIn: firstPair.token0 === tokenInAddr
      ? firstPair.liquidityInfo.reserve0
      : firstPair.liquidityInfo.reserve1,
  };
}

export function checkRouteLiquidity(
  params: SwapQuoteParams,
  route: BackendRoutePair[],
  path: string[],
  calculatedAmountIn?: string,
): {
  maxOut?: string;
  liquidityStatus?: LiquidityStatus;
} {
  if (route.length === 0 || !params.tokenIn || !params.tokenOut) {
    return {};
  }

  const firstHop = getFirstRouteHop(route, path);
  if (!firstHop) {
    return {};
  }

  const { pair: firstPair, reserveIn: reserveToCheck } = firstHop;

  if (!reserveToCheck) {
    return {};
  }

  const amountInAettos = toAettos(
    params.isExactIn ? params.amountIn : (calculatedAmountIn || '0'),
    params.tokenIn.decimals,
  );
  const reserveAettos = BigInt(reserveToCheck);

  if (amountInAettos <= reserveAettos) {
    return {
      liquidityStatus: { exceedsLiquidity: false, pairAddress: firstPair.address },
    };
  }

  const humanRatio = getHumanRouteRatio(route, params.tokenIn, params.tokenOut);
  const maxAvailableIn = fromAettos(reserveAettos, params.tokenIn.decimals);
  const maxAvailableDecimal = Decimal.from(maxAvailableIn);

  return {
    maxOut: humanRatio ? maxAvailableDecimal.mul(humanRatio).toString() : undefined,
    liquidityStatus: {
      exceedsLiquidity: true,
      maxAvailable: maxAvailableIn,
      pairAddress: firstPair.address,
    },
  };
}

export function useSwapQuote() {
  const { sdk } = useAeSdk();
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo>({ path: [] });
  const quoteSeqRef = useRef(0);
  const quoteTimerRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (quoteTimerRef.current) window.clearTimeout(quoteTimerRef.current);
  }, []);

  const buildBestPath = useCallback(async (
    tokenIn: DexTokenDto,
    tokenOut: DexTokenDto,
  ): Promise<{
    path: string[] | null;
    route?: BackendRoutePair[];
  }> => {
    if (isAeToWae(tokenIn, tokenOut)) {
      return { path: [CONFIG.DEX_WAE] };
    }

    try {
      if (!tokenIn || !tokenOut) return { path: null };

      const tokenInAddr = getTokenAddress(tokenIn);
      const tokenOutAddr = getTokenAddress(tokenOut);

      if (!tokenInAddr || !tokenOutAddr) return { path: null };

      // Match dex-ui: fetch swap-routes from dex-backend and derive
      // path/ratio from ordered route reserves.
      try {
        const [sortedA, sortedB] = sortTokens(tokenInAddr, tokenOutAddr);
        const routes = await getSwapRoutes(sortedA, sortedB);
        const synchronizedRoutes = routes?.filter((pairs) => pairs.every((pair: any) => pair.synchronized))
          ?? [];
        const candidateRoutes = synchronizedRoutes.length ? synchronizedRoutes : (routes ?? []);

        for (const route of candidateRoutes) {
          const computedPath = getPath(route as any, tokenInAddr);
          if (computedPath[computedPath.length - 1] === tokenOutAddr) {
            return {
              path: computedPath,
              route: route as BackendRoutePair[],
            };
          }
        }
      } catch (e) {
        // Ignore dex-backend route discovery failures and fall back to on-chain.
      }

      // Fallback via contracts
      if (!sdk) return { path: null };
      const { factory } = await initDexContracts(sdk);
      const direct = await fetchPairReserves(sdk, factory, tokenInAddr, tokenOutAddr);
      if (direct) {
        return { path: [tokenInAddr, tokenOutAddr] };
      }

      if (tokenInAddr !== CONFIG.DEX_WAE && tokenOutAddr !== CONFIG.DEX_WAE) {
        const legA = await fetchPairReserves(sdk, factory, tokenInAddr, CONFIG.DEX_WAE);
        const legB = await fetchPairReserves(sdk, factory, CONFIG.DEX_WAE, tokenOutAddr);
        if (legA && legB) {
          return { path: [tokenInAddr, CONFIG.DEX_WAE, tokenOutAddr] };
        }
      }
      return { path: null };
    } catch (e) {
      return { path: null };
    }
  }, [sdk]);

  const refreshQuote = useCallback(async (
    params: SwapQuoteParams,
    onQuoteResult?: (result: QuoteResult) => void,
  ): Promise<QuoteResult> => {
    setError(null);
    const drivingAmount = params.isExactIn ? params.amountIn : params.amountOut;

    // Validation
    if (!drivingAmount || !params.tokenIn || !params.tokenOut) {
      return { path: [] };
    }

    if (Number(drivingAmount) === 0) {
      const result: QuoteResult = {
        amountOut: '', amountIn: '', path: [], priceImpact: 0,
      };
      setRouteInfo({ path: [], priceImpact: 0 });
      onQuoteResult?.(result);
      return result;
    }

    if (Number(drivingAmount) < 0) {
      return { path: [] };
    }

    const seq = ++quoteSeqRef.current;
    setQuoteLoading(true);

    try {
      // Handle AE to WAE conversion with 1:1 ratio
      if (isAeToWae(params.tokenIn, params.tokenOut)) {
        const path = [
          params.tokenIn.address === 'AE' ? 'AE' : CONFIG.DEX_WAE,
          params.tokenOut.address === 'AE' ? 'AE' : CONFIG.DEX_WAE,
        ];
        const result: QuoteResult = {
          amountOut: params.isExactIn ? params.amountIn : undefined,
          amountIn: params.isExactIn ? undefined : params.amountOut,
          path,
          priceImpact: 0,
        };

        if (seq === quoteSeqRef.current) {
          setRouteInfo({ path, priceImpact: 0 });
          onQuoteResult?.(result);
          setQuoteLoading(false);
        }

        return result;
      }

      const { path, route } = await buildBestPath(params.tokenIn, params.tokenOut);

      if (!path) throw new Error('No route found');

      let amountOut: string | undefined;
      let amountIn: string | undefined;
      let maxOut: string | undefined;
      let liquidityStatus: LiquidityStatus | undefined;
      let currentRouteForPriceImpact:
      Array<{
        token0: string;
        token1: string;
        liquidityInfo: { reserve0: string; reserve1: string };
      }> | undefined;

      if (route?.length) {
        const routeResult = calculateRouteAmount(params, route);
        amountOut = routeResult.amountOut;
        amountIn = routeResult.amountIn;

        const liquidityResult = checkRouteLiquidity(params, route, path, amountIn);
        maxOut = liquidityResult.maxOut;
        liquidityStatus = liquidityResult.liquidityStatus;
        currentRouteForPriceImpact = route.map((pair) => ({
          token0: pair.token0,
          token1: pair.token1,
          liquidityInfo: {
            reserve0: pair.liquidityInfo.reserve0,
            reserve1: pair.liquidityInfo.reserve1,
          },
        }));
      }

      // Always get router contract's actual expected output for swap execution
      const { router } = await initDexContracts(sdk);
      let routerAmountOut: string | undefined;
      let routerAmountIn: string | undefined;

      if (params.isExactIn && amountOut !== undefined) {
        try {
          const amountInAettos = toAettos(params.amountIn, params.tokenIn.decimals);
          const { decodedResult } = await router.get_amounts_out(amountInAettos, path);
          const outAettos = decodedResult[decodedResult.length - 1];
          routerAmountOut = fromAettos(outAettos, params.tokenOut.decimals);
        } catch (e) {
          // Ignore and fall back to ratio-based calculation.
        }
      } else if (!params.isExactIn && amountIn !== undefined) {
        try {
          const amountOutAettos = toAettos(params.amountOut, params.tokenOut.decimals);
          const { decodedResult } = await router.get_amounts_in(amountOutAettos, path);
          const inAettos = decodedResult[0];
          routerAmountIn = fromAettos(inAettos, params.tokenIn.decimals);
        } catch (e) {
          // Ignore and fall back to ratio-based calculation.
        }
      }

      // Use reserve-derived route math for spot ratio and liquidity checks,
      // but prefer the router quote for the actual displayed swap amounts.
      if (params.isExactIn && routerAmountOut !== undefined) {
        amountOut = routerAmountOut;
      } else if (!params.isExactIn && routerAmountIn !== undefined) {
        amountIn = routerAmountIn;
      }

      // Fallback to router contract if no pairData available
      if (amountOut === undefined && amountIn === undefined) {
        if (params.isExactIn) {
          const amountInAettos = toAettos(params.amountIn, params.tokenIn.decimals);
          const { decodedResult } = await router.get_amounts_out(amountInAettos, path);
          const outAettos = decodedResult[decodedResult.length - 1];
          amountOut = fromAettos(outAettos, params.tokenOut.decimals);
          routerAmountOut = amountOut;
        } else {
          const amountOutAettos = toAettos(params.amountOut, params.tokenOut.decimals);
          const { decodedResult } = await router.get_amounts_in(amountOutAettos, path);
          const inAettos = decodedResult[0];
          amountIn = fromAettos(inAettos, params.tokenIn.decimals);
          routerAmountIn = amountIn;
        }
      }

      // Compute price impact when backend provided reserves
      let priceImpact: number | undefined;
      try {
        if (currentRouteForPriceImpact && currentRouteForPriceImpact.length >= 1) {
          const amountInAettosNum = toAettos(params.amountIn || amountIn || '0', params.tokenIn.decimals);
          priceImpact = getPriceImpactForRoute(currentRouteForPriceImpact as any, path[0], amountInAettosNum);
        }
      } catch {
        priceImpact = undefined;
      }

      if (seq === quoteSeqRef.current) {
        setRouteInfo({
          path,
          priceImpact,
          reserves: route?.map((pair) => ({
            token0: pair.token0,
            token1: pair.token1,
            reserve0: pair.liquidityInfo.reserve0,
            reserve1: pair.liquidityInfo.reserve1,
          })),
          liquidityStatus,
          routerAmountOut: routerAmountOut || amountOut,
          routerAmountIn: routerAmountIn || amountIn,
        });
        onQuoteResult?.({
          amountOut, amountIn, path, priceImpact, maxOut,
        });
      }

      return {
        amountOut, amountIn, path, priceImpact, maxOut,
      };
    } catch (e: any) {
      if (seq === quoteSeqRef.current) {
        setError(errorToUserMessage(e, { action: 'quote' }));
      }
      return { path: [] };
    } finally {
      if (seq === quoteSeqRef.current) setQuoteLoading(false);
    }
  }, [buildBestPath, sdk]);

  const debouncedQuote = useCallback((
    params: SwapQuoteParams,
    onQuoteResult?: (result: QuoteResult) => void,
    delay = 300,
  ) => {
    if (quoteTimerRef.current) window.clearTimeout(quoteTimerRef.current);
    quoteTimerRef.current = window.setTimeout(() => {
      void refreshQuote(params, onQuoteResult);
    }, delay);
  }, [refreshQuote]);

  const cancelDebouncedQuote = useCallback(() => {
    if (quoteTimerRef.current) {
      window.clearTimeout(quoteTimerRef.current);
      quoteTimerRef.current = null;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    quoteLoading,
    error,
    routeInfo,
    refreshQuote,
    debouncedQuote,
    cancelDebouncedQuote,
    clearError,
  };
}
