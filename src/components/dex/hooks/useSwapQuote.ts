/* eslint-disable */
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { DexPairService, PairDto, DexTokenDto } from '@/api/generated';
import BigNumber from 'bignumber.js';
import { useAeSdk } from '../../../hooks';
import {
  DEX_ADDRESSES,
  fetchPairReserves,
  fromAettos,
  initDexContracts,
  toAettos,
} from '../../../libs/dex';
import { errorToUserMessage } from '../../../libs/errorMessages';
import { getPriceImpactForRoute } from '../../../libs/swapUtils';
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

interface LiquidityStatus {
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
  const isAetoWae = tokenIn.address === 'AE' && tokenOut.address === DEX_ADDRESSES.wae;
  const isWaeToAe = tokenIn.address === DEX_ADDRESSES.wae && tokenOut.address === 'AE';
  return isAetoWae || isWaeToAe;
}

function getTokenAddress(token: DexTokenDto): string {
  return token.is_ae ? DEX_ADDRESSES.wae : token.address;
}

/**
 * Calculate ratio from reserves: reserveOut / reserveIn
 */
function calculateRatio(reserveIn: string, reserveOut: string): BigNumber {
  const reserveInBN = new BigNumber(reserveIn);
  const reserveOutBN = new BigNumber(reserveOut);
  return reserveOutBN.div(reserveInBN);
}

/**
 * Calculate direct pair swap amount using ratio
 */
function calculateDirectPairAmount(
  params: SwapQuoteParams,
  pair: PairWithReserves,
  tokenInAddr: string,
  tokenOutAddr: string,
): {
  amountOut?: string;
  amountIn?: string;
  maxOut?: string;
  liquidityStatus?: LiquidityStatus;
} {
  const isToken0ToToken1 = pair.token0.address === tokenInAddr && pair.token1.address === tokenOutAddr;
  const isToken1ToToken0 = pair.token1.address === tokenInAddr && pair.token0.address === tokenOutAddr;

  if (!isToken0ToToken1 && !isToken1ToToken0) {
    return {};
  }

  const reserveIn = isToken0ToToken1 ? pair.reserve0 : pair.reserve1;
  const reserveOut = isToken0ToToken1 ? pair.reserve1 : pair.reserve0;

  if (!reserveIn || !reserveOut) {
    return {};
  }

  const ratio = calculateRatio(reserveIn, reserveOut);
  const reserveInAettos = BigInt(reserveIn);

  if (params.isExactIn) {
    const amountInAettos = toAettos(params.amountIn, params.tokenIn.decimals);
    const amountOutAettosBN = new BigNumber(amountInAettos.toString()).multipliedBy(ratio);
    const amountOut = fromAettos(amountOutAettosBN.toFixed(0), params.tokenOut.decimals);

    let maxOut: string | undefined;
    let liquidityStatus: LiquidityStatus | undefined;

    if (amountInAettos > reserveInAettos) {
      const maxAvailableAettos = reserveInAettos;
      const maxAvailableDecimal = Decimal.from(fromAettos(maxAvailableAettos, params.tokenIn.decimals));
      const maxAvailableOutAettosBN = new BigNumber(maxAvailableAettos.toString()).multipliedBy(ratio);
      maxOut = fromAettos(maxAvailableOutAettosBN.toFixed(0), params.tokenOut.decimals);
      liquidityStatus = {
        exceedsLiquidity: true,
        maxAvailable: maxAvailableDecimal.toString(),
        pairAddress: pair.address,
      };
    } else {
      liquidityStatus = { exceedsLiquidity: false, pairAddress: pair.address };
    }

    return { amountOut, maxOut, liquidityStatus };
  }
  const amountOutAettos = toAettos(params.amountOut, params.tokenOut.decimals);
  const amountOutAettosBN = new BigNumber(amountOutAettos.toString());
  const calculatedAmountInAettosBN = amountOutAettosBN.div(ratio);
  const calculatedAmountInAettos = BigInt(calculatedAmountInAettosBN.toFixed(0));
  const amountIn = fromAettos(calculatedAmountInAettosBN.toFixed(0), params.tokenIn.decimals);

  let maxOut: string | undefined;
  let liquidityStatus: LiquidityStatus | undefined;

  if (calculatedAmountInAettos > reserveInAettos) {
    const maxAvailableInAettos = reserveInAettos;
    const maxAvailableInDecimal = Decimal.from(fromAettos(maxAvailableInAettos, params.tokenIn.decimals));
    const maxAvailableInAettosBN = new BigNumber(maxAvailableInAettos.toString());
    const maxAvailableOutAettosBN = maxAvailableInAettosBN.multipliedBy(ratio);
    maxOut = fromAettos(maxAvailableOutAettosBN.toFixed(0), params.tokenOut.decimals);
    liquidityStatus = {
      exceedsLiquidity: true,
      maxAvailable: maxAvailableInDecimal.toString(),
      pairAddress: pair.address,
    };
  } else {
    liquidityStatus = { exceedsLiquidity: false, pairAddress: pair.address };
  }

  return { amountIn, maxOut, liquidityStatus };
}

/**
 * Calculate multi-hop route amount using sequential ratios
 */
function calculateMultiHopAmount(
  params: SwapQuoteParams,
  pathPairs: PairWithReserves[],
  path: string[],
): {
  amountOut?: string;
  amountIn?: string;
  maxOut?: string;
  liquidityStatus?: LiquidityStatus;
} {
  let currentAmount = params.isExactIn
    ? Decimal.from(params.amountIn)
    : Decimal.from(params.amountOut);

  if (params.isExactIn) {
    // Forward calculation: multiply ratios
    for (let i = 0; i < pathPairs.length; i++) {
      const pair = pathPairs[i];
      const currentTokenAddr = path[i];
      const nextTokenAddr = path[i + 1];
      const isToken0ToToken1 = pair.token0.address === currentTokenAddr && pair.token1.address === nextTokenAddr;

      const reserveIn = isToken0ToToken1 ? pair.reserve0 : pair.reserve1;
      const reserveOut = isToken0ToToken1 ? pair.reserve1 : pair.reserve0;

      if (!reserveIn || !reserveOut) continue;

      const hopRatio = calculateRatio(reserveIn, reserveOut);
      const currentAmountAettos = toAettos(currentAmount.toString(), isToken0ToToken1 ? pair.token0.decimals : pair.token1.decimals);
      const currentAmountAettosBN = new BigNumber(currentAmountAettos.toString());
      const nextAmountAettosBN = currentAmountAettosBN.multipliedBy(hopRatio);
      const nextDecimals = isToken0ToToken1 ? pair.token1.decimals : pair.token0.decimals;
      currentAmount = Decimal.from(fromAettos(nextAmountAettosBN.toFixed(0), nextDecimals));
    }
    return { amountOut: currentAmount.toString() };
  }
  // Backward calculation: divide ratios
  for (let i = pathPairs.length - 1; i >= 0; i--) {
    const pair = pathPairs[i];
    const currentTokenAddr = path[i + 1];
    const prevTokenAddr = path[i];
    const isToken0ToToken1 = pair.token0.address === prevTokenAddr && pair.token1.address === currentTokenAddr;

    const reserveIn = isToken0ToToken1 ? pair.reserve0 : pair.reserve1;
    const reserveOut = isToken0ToToken1 ? pair.reserve1 : pair.reserve0;

    if (!reserveIn || !reserveOut) continue;

    const hopRatio = calculateRatio(reserveIn, reserveOut);
    const currentAmountAettos = toAettos(currentAmount.toString(), isToken0ToToken1 ? pair.token1.decimals : pair.token0.decimals);
    const currentAmountAettosBN = new BigNumber(currentAmountAettos.toString());
    const prevAmountAettosBN = currentAmountAettosBN.div(hopRatio);
    const prevDecimals = isToken0ToToken1 ? pair.token0.decimals : pair.token1.decimals;
    currentAmount = Decimal.from(fromAettos(prevAmountAettosBN.toFixed(0), prevDecimals));
  }
  return { amountIn: currentAmount.toString() };
}

/**
 * Check liquidity and calculate maxOut for multi-hop routes
 */
function checkMultiHopLiquidity(
  params: SwapQuoteParams,
  pathPairs: PairWithReserves[],
  path: string[],
  calculatedAmountIn?: string,
): {
  maxOut?: string;
  liquidityStatus?: LiquidityStatus;
} {
  if (pathPairs.length === 0) {
    return {};
  }

  const firstPair = pathPairs[0] as PairWithReserves;
  const firstTokenAddr = path[0];
  const isToken0 = firstPair.token0.address === firstTokenAddr;
  const reserveToCheck = isToken0 ? firstPair.reserve0 : firstPair.reserve1;

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

  // Calculate maxOut with max available input
  const maxAvailableInAettos = reserveAettos;
  let maxOutAmount = Decimal.from(fromAettos(maxAvailableInAettos, params.tokenIn.decimals));

  if (params.isExactIn) {
    // Apply all hops with max available input
    for (let i = 0; i < pathPairs.length; i++) {
      const pair = pathPairs[i] as PairWithReserves;
      const currentTokenAddr = path[i];
      const nextTokenAddr = path[i + 1];
      const isToken0ToToken1 = pair.token0.address === currentTokenAddr && pair.token1.address === nextTokenAddr;

      const reserveIn = isToken0ToToken1 ? pair.reserve0 : pair.reserve1;
      const reserveOut = isToken0ToToken1 ? pair.reserve1 : pair.reserve0;

      if (!reserveIn || !reserveOut) continue;

      const hopRatio = calculateRatio(reserveIn, reserveOut);
      const currentAmountAettos = toAettos(maxOutAmount.toString(), isToken0ToToken1 ? pair.token0.decimals : pair.token1.decimals);
      const currentAmountAettosBN = new BigNumber(currentAmountAettos.toString());
      const nextAmountAettosBN = currentAmountAettosBN.multipliedBy(hopRatio);
      const nextDecimals = isToken0ToToken1 ? pair.token1.decimals : pair.token0.decimals;
      maxOutAmount = Decimal.from(fromAettos(nextAmountAettosBN.toFixed(0), nextDecimals));
    }
  }

  return {
    maxOut: params.isExactIn ? maxOutAmount.toString() : params.amountOut,
    liquidityStatus: {
      exceedsLiquidity: true,
      maxAvailable: fromAettos(reserveAettos, params.tokenIn.decimals),
      pairAddress: firstPair.address,
    },
  };
}

export function useSwapQuote() {
  const { sdk } = useAeSdk();
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo>({ path: [] });
  const routeInfoRef = useRef<RouteInfo>({ path: [] });
  const quoteSeqRef = useRef(0);
  const quoteTimerRef = useRef<number | null>(null);
  useEffect(() => {
    routeInfoRef.current = routeInfo;
  }, [routeInfo]);
  useEffect(() => () => {
    if (quoteTimerRef.current) window.clearTimeout(quoteTimerRef.current);
  }, []);

  const buildBestPath = useCallback(async (
    tokenIn: DexTokenDto,
    tokenOut: DexTokenDto,
  ): Promise<{
    path: string[] | null;
    pairData?: {
      directPairs?: PairDto[];
      paths?: PairDto[][];
    };
  }> => {
    if (isAeToWae(tokenIn, tokenOut)) {
      return { path: [DEX_ADDRESSES.wae] };
    }

    try {
      if (!tokenIn || !tokenOut) return { path: null };

      const tokenInAddr = getTokenAddress(tokenIn);
      const tokenOutAddr = getTokenAddress(tokenOut);

      if (!tokenInAddr || !tokenOutAddr) return { path: null };

      // Use the providers API endpoint to find swap routes
      try {
        const result = await DexPairService.findPairsForTokens({
          fromToken: tokenInAddr,
          toToken: tokenOutAddr,
        });

        // Check for direct pairs first
        if (result?.hasDirectPath && result?.directPairs?.length) {
          const directPair = result.directPairs[0];
          return {
            path: [tokenInAddr, tokenOutAddr],
            pairData: {
              directPairs: result.directPairs as PairDto[],
              paths: result.paths,
            },
          };
        }

        // Check for paths (multi-hop routes)
        if (result?.paths?.length && result.paths[0]?.length) {
          const firstPath = result.paths[0];
          const hops = [tokenInAddr];

          for (const pair of firstPath) {
            const last = hops[hops.length - 1];
            const next = pair.token0?.address === last
              ? pair.token1?.address
              : pair.token1?.address === last
                ? pair.token0?.address
                : null;

            if (!next) break;
            hops.push(next);
          }

          if (hops[hops.length - 1] === tokenOutAddr) {
            return {
              path: hops,
              pairData: {
                directPairs: result.directPairs,
                paths: result.paths,
              },
            };
          }
        }
      } catch (e) {
        // Ignore provider route discovery failures and fall back to on-chain.
      }

      // Fallback via contracts
      if (!sdk) return { path: null };
      const { factory } = await initDexContracts(sdk);
      const direct = await fetchPairReserves(sdk, factory, tokenInAddr, tokenOutAddr);
      if (direct) {
        return { path: [tokenInAddr, tokenOutAddr] };
      }

      if (tokenInAddr !== DEX_ADDRESSES.wae && tokenOutAddr !== DEX_ADDRESSES.wae) {
        const legA = await fetchPairReserves(sdk, factory, tokenInAddr, DEX_ADDRESSES.wae);
        const legB = await fetchPairReserves(sdk, factory, DEX_ADDRESSES.wae, tokenOutAddr);
        if (legA && legB) {
          return { path: [tokenInAddr, DEX_ADDRESSES.wae, tokenOutAddr] };
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
          params.tokenIn.address === 'AE' ? 'AE' : DEX_ADDRESSES.wae,
          params.tokenOut.address === 'AE' ? 'AE' : DEX_ADDRESSES.wae,
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

      const tokenInAddr = getTokenAddress(params.tokenIn);
      const tokenOutAddr = getTokenAddress(params.tokenOut);

      const { path, pairData } = await buildBestPath(params.tokenIn, params.tokenOut);

      if (!path) throw new Error('No route found');

      let amountOut: string | undefined;
      let amountIn: string | undefined;
      let maxOut: string | undefined;
      let liquidityStatus: LiquidityStatus | undefined;

      // Use ratio-based calculation if pairData is available from backend
      if (pairData) {
        // Direct pair swap
        if (path.length === 2 && pairData.directPairs?.length) {
          const pair = pairData.directPairs[0] as PairWithReserves;
          const result = calculateDirectPairAmount(params, pair, tokenInAddr, tokenOutAddr);
          amountOut = result.amountOut;
          amountIn = result.amountIn;
          maxOut = result.maxOut;
          liquidityStatus = result.liquidityStatus;
        }
        // Multi-hop route
        else if (path.length > 2 && pairData.paths?.length && pairData.paths[0]?.length) {
          const pathPairs = pairData.paths[0] as PairWithReserves[];
          const multiHopResult = calculateMultiHopAmount(params, pathPairs, path);
          amountOut = multiHopResult.amountOut;
          amountIn = multiHopResult.amountIn;

          const liquidityResult = checkMultiHopLiquidity(params, pathPairs, path, amountIn);
          maxOut = liquidityResult.maxOut;
          liquidityStatus = liquidityResult.liquidityStatus;
        }
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
        const route = routeInfoRef.current.reserves;
        if (route && route.length >= 1) {
          const amountInAettosNum = toAettos(params.amountIn || amountIn || '0', params.tokenIn.decimals);
          priceImpact = getPriceImpactForRoute(route as any, path[0], amountInAettosNum);
        }
      } catch {
        priceImpact = undefined;
      }

      if (seq === quoteSeqRef.current) {
        setRouteInfo({
          path,
          priceImpact,
          pairData: pairData
            ? {
              directPairs: pairData.directPairs as any,
              paths: pairData.paths as any,
            }
            : undefined,
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

  return {
    quoteLoading,
    error,
    routeInfo,
    refreshQuote,
    debouncedQuote,
    clearError: () => setError(null),
  };
}
