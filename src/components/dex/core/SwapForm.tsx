import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DexService, DexTokenDto, PairDto } from '../../../api/generated';
import DexSettings from '../../../features/dex/components/DexSettings';
import { DEX_ADDRESSES } from '../../../libs/dex';
import ConnectWalletButton from '../../ConnectWalletButton';
import { useSwapExecution } from '../hooks/useSwapExecution';
import { useSwapQuote } from '../hooks/useSwapQuote';
import { useTokenBalances } from '../hooks/useTokenBalances';
import { useTokenList } from '../hooks/useTokenList';
import { SwapQuoteParams } from '../types/dex';
import SwapConfirmation from './SwapConfirmation';
import SwapRouteInfo from './SwapRouteInfo';
import TokenInput from './TokenInput';
import { Decimal } from '../../../libs/decimal';

import { useAccount, useDex } from '../../../hooks';
import { useAeSdk } from '../../../hooks/useAeSdk';
import { useQuery } from '@tanstack/react-query';

export interface SwapFormProps {
  onPairSelected?: (pair: PairDto) => void;
  onFromTokenSelected?: (token: DexTokenDto) => void;
}

export default function SwapForm({ onPairSelected, onFromTokenSelected }: SwapFormProps) {
  const { activeAccount: address } = useAccount();
  const { slippagePct, deadlineMins } = useDex();
  const { activeNetwork } = useAeSdk();
  const location = useLocation();
  const navigate = useNavigate();

  // Token list and balances
  const { tokens, loading: tokensLoading } = useTokenList();
  const [tokenIn, setTokenIn] = useState<DexTokenDto | null>(null);
  const [tokenOut, setTokenOut] = useState<DexTokenDto | null>(null);
  const { balances } = useTokenBalances(tokenIn, tokenOut);

  const { data: pair } = useQuery({
    queryKey: ['DexService.getPairByFromTokenAndToToken', tokenIn?.address, tokenOut?.address],
    queryFn: () => {
      if (!tokenIn || !tokenOut) return null;
      return DexService.getPairByFromTokenAndToToken({
        fromToken: tokenIn.address == 'ae' ? DEX_ADDRESSES.wae : tokenIn.address,
        toToken: tokenOut.address == 'ae' ? DEX_ADDRESSES.wae : tokenOut.address
      });
    },
    enabled: !!tokenIn?.address && !!tokenOut?.address,
  })

  useEffect(() => {
    console.log('[SwapForm] Pair found:', pair, tokenIn?.address, tokenOut?.address);
    if (pair) {
      console.log('[SwapForm] Pair found:', pair);
      onPairSelected?.(pair);
    }
  }, [pair, onPairSelected]);

  useEffect(() => {
    if (tokenIn) {
      onFromTokenSelected?.(tokenIn);
    }
  }, [tokenIn, onFromTokenSelected]);

  // Amounts and swap state
  const [amountIn, setAmountIn] = useState<string>('');
  const [amountOut, setAmountOut] = useState<string>('');
  const [isExactIn, setIsExactIn] = useState<boolean>(true);
  const [searchIn, setSearchIn] = useState('');
  const [searchOut, setSearchOut] = useState('');

  // Quote and execution
  const { quoteLoading, error, routeInfo, debouncedQuote } = useSwapQuote();
  const { loading: swapLoading, allowanceInfo, executeSwap } = useSwapExecution();

  const handleQuoteResult = (result: { amountOut?: string; amountIn?: string; path: string[]; priceImpact?: number }) => {
    if (result.amountOut !== undefined && isExactIn) {
      setAmountOut(result.amountOut);
    }
    if (result.amountIn !== undefined && !isExactIn) {
      setAmountIn(result.amountIn);
    }
  };

  // UI state
  const [showConfirm, setShowConfirm] = useState(false);

  // Function to fetch token metadata from middleware
  const fetchTokenFromMiddleware = useCallback(async (address: string): Promise<DexTokenDto | null> => {
    try {
      const _token = DexService.getDexTokenByAddress({ address });
      return _token;
    } catch (error) {
      console.warn('[SwapForm] Failed to fetch token from middleware:', address, error);
      return null;
    }
  }, [activeNetwork.middlewareUrl]);

  // Helper function to find token by address or symbol
  const findTokenByAddressOrSymbol = useCallback(async (identifier: string): Promise<DexTokenDto | null> => {
    if (!identifier) return null;

    // If identifier is 'AE', find the AE token
    if (identifier === 'AE') {
      return tokens.find(t => t.is_ae) || null;
    }

    // First, try to find in the local token list
    const localToken = tokens.find(t => t.address === identifier);
    if (localToken) return localToken;

    // If not found locally and it looks like a contract address, fetch from middleware
    if (identifier.startsWith('ct_')) {
      return await fetchTokenFromMiddleware(identifier);
    }

    return null;
  }, [tokens, fetchTokenFromMiddleware]);

  // Function to update URL parameters based on current token selection
  const updateUrlParams = useCallback((newTokenIn: DexTokenDto | null, newTokenOut: DexTokenDto | null) => {
    const searchParams = new URLSearchParams(location.search);

    // Update or remove 'from' parameter
    if (newTokenIn) {
      const fromValue = newTokenIn.is_ae ? 'AE' : newTokenIn.address;
      searchParams.set('from', fromValue);
    } else {
      searchParams.delete('from');
    }

    // Update or remove 'to' parameter
    if (newTokenOut) {
      const toValue = newTokenOut.is_ae ? 'AE' : newTokenOut.address;
      searchParams.set('to', toValue);
    } else {
      searchParams.delete('to');
    }

    // Update the URL without causing a page reload
    const newUrl = `${location.pathname}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    navigate(newUrl, { replace: true });
  }, [location.pathname, location.search, navigate]);

  // Initialize tokens from URL parameters or defaults
  useEffect(() => {
    if (!tokens.length) return;

    let cancelled = false;

    const initializeTokens = async () => {
      console.log('[SwapForm] Initialize tokens');
      const searchParams = new URLSearchParams(location.search);
      const fromParam = searchParams.get('from');
      const toParam = searchParams.get('to');

      // Set tokenIn based on URL param or default
      if (fromParam && !tokenIn) {
        const foundToken = await findTokenByAddressOrSymbol(fromParam);
        if (foundToken && !cancelled) {
          setTokenIn(foundToken);
        }
      } else if (!tokenIn && !fromParam) {
        // Default to tokens[2] if no URL param and no current selection
        setTokenIn(tokens[2] || null);
      }

      // Set tokenOut based on URL param or default
      if (toParam && !tokenOut) {
        const foundToken = await findTokenByAddressOrSymbol(toParam);
        if (foundToken && !cancelled) {
          setTokenOut(foundToken);
        }
      } else if (!tokenOut && !toParam) {
        // Default to tokens[0] if no URL param and no current selection
        setTokenOut(tokens[0] || null);
      }
    };

    initializeTokens();

    return () => {
      cancelled = true;
    };
  }, [tokens, location.search, tokenIn, tokenOut, findTokenByAddressOrSymbol]);

  // Update URL parameters when tokens change (after initial load)
  useEffect(() => {
    // Skip URL updates during initial load or when tokens are being set from URL params
    if (!tokens.length || (!tokenIn && !tokenOut)) return;

    // Only update URL if we have at least one token selected and tokens are loaded
    if (tokenIn || tokenOut) {
      updateUrlParams(tokenIn, tokenOut);
    }
  }, [tokenIn, tokenOut, tokens.length, updateUrlParams]);

  // Quote for exact-in mode when amountIn or tokens change
  useEffect(() => {
    if (!isExactIn) return;
    const params: SwapQuoteParams = {
      amountIn,
      amountOut,
      tokenIn,
      tokenOut,
      isExactIn
    };
    console.log("call debouncedQuote::", params);
    debouncedQuote(params, handleQuoteResult);
  }, [isExactIn, amountIn, tokenIn, tokenOut]);
  // }, [isExactIn, amountIn, tokenIn, tokenOut, debouncedQuote]);

  // Quote for exact-out mode when amountOut or tokens change
  useEffect(() => {
    if (isExactIn) return;
    const params: SwapQuoteParams = {
      amountIn,
      amountOut,
      tokenIn,
      tokenOut,
      isExactIn
    };
    debouncedQuote(params, handleQuoteResult);
  }, [isExactIn, amountOut, tokenIn, tokenOut, debouncedQuote]);

  // Handle quote results
  useEffect(() => {
    if (routeInfo.path.length > 0 && isExactIn && amountIn) {
      // The quote hook should handle updating amountOut
      // This effect can be used for additional side effects if needed
    }
  }, [routeInfo, isExactIn, amountIn]);

  const handleSwap = async () => {
    if (!tokenIn || !tokenOut || !amountIn || !amountOut) return;

    // Additional validation before executing swap
    if (routeInfo.path.length === 0) {
      console.error('No valid route found for swap');
      return;
    }

    if (error) {
      console.error('Cannot execute swap with existing quote error:', error);
      return;
    }

    try {
      const txHash = await executeSwap({
        amountIn,
        amountOut,
        tokenIn,
        tokenOut,
        path: routeInfo.path,
        slippagePct,
        deadlineMins,
        isExactIn
      });

      if (txHash) {
        setAmountIn('');
        setAmountOut('');
        setShowConfirm(false);
      }
    } catch (error) {
      console.error('Swap failed:', error);
    }
  };

  const filteredInTokens = useMemo(() => {
    const term = searchIn.trim().toLowerCase();
    const matches = (t: DexTokenDto) =>
      !term || t.symbol.toLowerCase().includes(term) || (t.address || '').toLowerCase().includes(term);
    const ae = tokens.find((t) => t.is_ae);
    const wae = tokens.find((t) => t.address === DEX_ADDRESSES.wae);
    const rest = tokens.filter((t) => t !== ae && t !== wae).filter(matches);
    const out: DexTokenDto[] = [];
    if (ae && matches(ae)) out.push(ae);
    if (wae && matches(wae)) out.push(wae);
    out.push(...rest);
    return out;
  }, [tokens, searchIn]);

  const filteredOutTokens = useMemo(() => {
    const term = searchOut.trim().toLowerCase();
    const matches = (t: DexTokenDto) =>
      !term || t.symbol.toLowerCase().includes(term) || (t.address || '').toLowerCase().includes(term);
    const ae = tokens.find((t) => t.is_ae);
    const wae = tokens.find((t) => t.address === DEX_ADDRESSES.wae);
    const rest = tokens.filter((t) => t !== ae && t !== wae).filter(matches);
    const out: DexTokenDto[] = [];
    if (ae && matches(ae)) out.push(ae);
    if (wae && matches(wae)) out.push(wae);
    out.push(...rest);
    return out;
  }, [tokens, searchOut]);

  const handleTokenSwap = () => {
    const tempToken = tokenIn;
    const tempAmount = amountIn;
    setTokenIn(tokenOut);
    setTokenOut(tempToken);
    setAmountIn(amountOut);
    setAmountOut(tempAmount);

    // Update URL parameters to reflect the swapped tokens
    updateUrlParams(tokenOut, tempToken);
  };

  // Balance validation
  const hasInsufficientBalance = useMemo(() => {
    if (!amountIn || !balances.in || Number(amountIn) <= 0) return false;
    try {
      return Decimal.from(amountIn).gt(Decimal.from(balances.in));
    } catch {
      return false;
    }
  }, [amountIn, balances.in]);

  const isSwapDisabled = swapLoading || !amountIn || Number(amountIn) <= 0 || !amountOut || !tokenIn || !tokenOut || hasInsufficientBalance;

  return (
    <div className="w-full sm:w-[480px] mx-auto bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.1)] relative overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold m-0 sh-dex-title">
          Swap Tokens
        </h2>

        <DexSettings title="Swap Settings">
          <button
            aria-label="open-settings"
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.02] text-white cursor-pointer backdrop-blur-[10px] transition-all duration-300 ease-out text-xs font-medium hover:bg-[#00ff9d] hover:-translate-y-0.5 active:translate-y-0"
          >
            ⚙️ Settings
          </button>
        </DexSettings>
      </div>

      {/* Token Input From */}
      <div className="mb-2">
        <TokenInput
          label="From"
          token={tokenIn}
          skipToken={tokenOut}
          amount={amountIn}
          balance={balances.in}
          onTokenChange={setTokenIn}
          onAmountChange={setAmountIn}
          tokens={filteredInTokens}
          excludeTokens={tokenOut ? [tokenOut] : []}
          disabled={swapLoading}
          loading={tokensLoading}
          searchValue={searchIn}
          onSearchChange={setSearchIn}
          hasInsufficientBalance={hasInsufficientBalance}
        />
      </div>

      {/* Swap Arrow Button */}
      <div className="flex justify-center my-4 relative">
        <button
          onClick={handleTokenSwap}
          disabled={swapLoading || !tokenIn || !tokenOut}
          className="w-12 h-12 rounded-full border border-white/10 bg-white/[0.08] backdrop-blur-[10px] text-white cursor-pointer flex items-center justify-center text-xl font-semibold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[0_4px_12px_rgba(0,0,0,0.25)] z-[2] relative hover:bg-white/[0.12] hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 hover:rotate-180 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:rotate-0"
        >
          ↕️
        </button>
      </div>

      {/* Token Input To */}
      <div className="mb-5">
        <TokenInput
          label="To"
          token={tokenOut}
          skipToken={tokenIn}
          amount={quoteLoading ? 'Quoting…' : amountOut}
          balance={balances.out}
          onTokenChange={setTokenOut}
          onAmountChange={(amount) => {
            setIsExactIn(false);
            setAmountOut(amount);
          }}
          tokens={filteredOutTokens}
          excludeTokens={tokenIn ? [tokenIn] : []}
          disabled={swapLoading}
          loading={tokensLoading}
          readOnly={isExactIn}
          searchValue={searchOut}
          onSearchChange={setSearchOut}
        />
      </div>

      {/* Trading Info Panel */}
      {(routeInfo.priceImpact != null || allowanceInfo) && (
        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-4 mb-5 backdrop-blur-[10px]">
          {routeInfo.priceImpact != null && (
            <div className={`flex justify-between items-center ${allowanceInfo ? 'mb-2' : ''}`}>
              <span className="text-sm text-white/60">
                Price Impact
              </span>
              <span className={`text-sm font-semibold ${
                routeInfo.priceImpact > 10 ? 'text-red-400' :
                routeInfo.priceImpact > 5 ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {routeInfo.priceImpact.toFixed(2)}%
              </span>
            </div>
          )}

          {allowanceInfo && !tokenIn?.is_ae && (
            <div className="text-xs text-white/60 py-2 px-3 bg-red-400/10 rounded-lg border border-red-400/20">
              {allowanceInfo}
            </div>
          )}
        </div>
      )}

      {/* Route Information */}
      <SwapRouteInfo
        routeInfo={routeInfo}
        tokens={tokens}
        tokenIn={tokenIn}
        tokenOut={tokenOut}
      />

      {/* Error Display */}
      {error && (
        <div className="text-red-400 text-sm py-3 px-4 bg-red-400/10 border border-red-400/20 rounded-xl mb-5 text-center">
          {error}
        </div>
      )}

      {/* Insufficient Balance Warning */}
      {hasInsufficientBalance && (
        <div className="text-red-400 text-sm py-3 px-4 bg-red-400/10 border border-red-400/20 rounded-xl mb-5 text-center">
          Insufficient {tokenIn?.symbol} balance. You need {amountIn} but only have {balances.in ? Decimal.from(balances.in).prettify() : '0'}
        </div>
      )}

      {/* Swap Button */}
      {address ? (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isSwapDisabled}
          className={`w-full px-6 py-3 sm:px-5 sm:py-3 rounded-full border-none text-white cursor-pointer text-base font-semibold tracking-wide uppercase transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
            isSwapDisabled
              ? 'bg-white/10 cursor-not-allowed opacity-60'
              : 'bg-[#1161FE] shadow-[0_8px_25px_rgba(17,97,254,0.4)] hover:shadow-[0_12px_35px_rgba(17,97,254,0.5)] hover:-translate-y-0.5 active:translate-y-0'
          }`}
        >
          {swapLoading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Confirm in wallet…
            </div>
          ) : 'Swap Tokens'}
        </button>
      ) : (
        <ConnectWalletButton
          label="Connect wallet"
          variant="dex"
          block
          className="w-full py-4 px-6 rounded-2xl border-none bg-[#1161FE] text-white text-base font-bold tracking-wider uppercase shadow-[0_8px_25px_rgba(17,97,254,0.4)] cursor-pointer hover:shadow-[0_12px_35px_rgba(17,97,254,0.5)] hover:-translate-y-0.5 active:translate-y-0"
        />
      )}

      {/* Confirmation Modal */}
      <SwapConfirmation
        show={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleSwap}
        tokenIn={tokenIn}
        tokenOut={tokenOut}
        amountIn={amountIn}
        amountOut={amountOut}
        isExactIn={isExactIn}
        slippagePct={slippagePct}
        deadlineMins={deadlineMins}
        priceImpactPct={routeInfo.priceImpact || null}
        path={routeInfo.path}
        loading={swapLoading}
      />

    </div>
  );
}
