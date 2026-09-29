/* eslint-disable */
import {
  useCallback, useEffect, useId, useMemo, useState,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  DexPairService, DexService, DexTokenDto, PairDto,
} from '../../../api/generated';
import { CONFIG } from '../../../config';
import ConnectWalletButton from '../../ConnectWalletButton';
import { useSwapExecution } from '../hooks/useSwapExecution';
import { useSwapQuote } from '../hooks/useSwapQuote';
import { useTokenBalances } from '../hooks/useTokenBalances';
import { useTokenList } from '../hooks/useTokenList';
import { SwapQuoteParams } from '../types/dex';
import SwapConfirmation from './SwapConfirmation';
import SwapInfoDisplay from './SwapInfoDisplay';
import SwapAmountField from './SwapAmountField';
import SwapInlineSettings from './SwapInlineSettings';
import './SwapForm.css';
import { Decimal } from '../../../libs/decimal';
import { ArrowDownUp, ArrowRight, Info, Settings2 } from 'lucide-react';

import { useAccount, useDex } from '../../../hooks';
import Spinner from '../../Spinner';

export interface SwapFormProps {
  onPairSelected?: (pair: PairDto) => void;
  onFromTokenSelected?: (token: DexTokenDto) => void;
}

export default function SwapForm({ onPairSelected, onFromTokenSelected }: SwapFormProps) {
  const { t } = useTranslation('dex');
  const { activeAccount: address } = useAccount();
  const { slippagePct, deadlineMins } = useDex();
  const location = useLocation();
  const navigate = useNavigate();

  // Token list and balances
  const { tokens, loading: tokensLoading } = useTokenList();
  const [tokenIn, setTokenIn] = useState<DexTokenDto | null>(null);
  const [tokenOut, setTokenOut] = useState<DexTokenDto | null>(null);
  const { balances } = useTokenBalances(tokenIn, tokenOut);

  const { data: pair } = useQuery({
    queryKey: ['DexPairService.getPairByFromTokenAndToToken', tokenIn?.address, tokenOut?.address],
    queryFn: () => {
      if (!tokenIn || !tokenOut) return null;
      return DexPairService.getPairByFromTokenAndToToken({
        fromToken: tokenIn.address == 'AE' ? CONFIG.DEX_WAE : tokenIn.address,
        toToken: tokenOut.address == 'AE' ? CONFIG.DEX_WAE : tokenOut.address,
      });
    },
    enabled: !!tokenIn?.address && !!tokenOut?.address,
  });

  useEffect(() => {
    if (pair) {
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
  const {
    quoteLoading, error, routeInfo, debouncedQuote, cancelDebouncedQuote,
  } = useSwapQuote();
  const { loading: swapLoading, swapStep, executeSwap } = useSwapExecution();

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsId = useId();

  // Function to fetch token metadata from middleware
  const fetchTokenFromMiddleware = useCallback(async (address: string): Promise<DexTokenDto | null> => {
    try {
      const _token = await DexService.getDexTokenByAddress({ address });
      return _token;
    } catch (error) {
      return null;
    }
  }, []);

  // Helper function to find token by address or symbol
  const findTokenByAddressOrSymbol = useCallback(async (identifier: string): Promise<DexTokenDto | null> => {
    if (!identifier) return null;

    // If identifier is 'AE', find the AE token
    if (identifier === 'AE') {
      return tokens.find((t) => t.is_ae) || null;
    }

    // First, try to find in the local token list
    const localToken = tokens.find((t) => t.address === identifier);
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
    const newUrl = `${location.pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    navigate(newUrl, { replace: true });
  }, [location.pathname, location.search, navigate]);

  // Initialize tokens from URL parameters or defaults
  useEffect(() => {
    if (!tokens.length) return;

    let cancelled = false;

    const initializeTokens = async () => {
      const searchParams = new URLSearchParams(location.search);
      const fromParam = searchParams.get('from');
      const toParam = searchParams.get('to');
      const defaultToAddress = 'ct_KeTvHnhU85vuuQMMZocaiYkPL9tkoavDRT3Jsy47LK2YqLHYb'; // WTT

      // Set tokenIn based on URL param or default
      if (fromParam && !tokenIn) {
        const foundToken = await findTokenByAddressOrSymbol(fromParam);
        if (foundToken && !cancelled) {
          setTokenIn(foundToken);
        }
      } else if (!tokenIn && !fromParam) {
        // Default: AE as input token
        const ae = tokens.find((t) => t.is_ae) || null;
        setTokenIn(ae || tokens[0] || null);
      }

      // Set tokenOut based on URL param or default
      if (toParam && !tokenOut) {
        const foundToken = await findTokenByAddressOrSymbol(toParam);
        if (foundToken && !cancelled) {
          setTokenOut(foundToken);
        }
      } else if (!tokenOut && !toParam) {
        // Default: WTT as output token when no URL param provided
        const wtt = await findTokenByAddressOrSymbol(defaultToAddress);
        if (wtt && !cancelled) {
          setTokenOut(wtt);
        }
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
    if (!tokens.length || !tokenIn || !tokenOut) return;

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
      isExactIn,
    };
    debouncedQuote(params, handleQuoteResult);
    return cancelDebouncedQuote;
  }, [isExactIn, amountIn, tokenIn, tokenOut, debouncedQuote]);

  // Quote for exact-out mode when amountOut or tokens change
  useEffect(() => {
    if (isExactIn) return;
    const params: SwapQuoteParams = {
      amountIn,
      amountOut,
      tokenIn,
      tokenOut,
      isExactIn,
    };
    debouncedQuote(params, handleQuoteResult);
    return cancelDebouncedQuote;
  }, [isExactIn, amountOut, tokenIn, tokenOut, debouncedQuote]);

  // Handle quote results
  const handleSwap = async () => {
    if (!tokenIn || !tokenOut || !amountIn || !amountOut || isSwapDisabled) return;

    // Additional validation before executing swap
    if (routeInfo.path.length === 0) {
      return;
    }

    if (error) {
      return;
    }

    try {
      // Use router's calculated amounts for execution (accounts for constant product formula)
      // Display amounts (amountIn/amountOut) are ratio-based for correct pricing display
      const executionAmountOut = routeInfo.routerAmountOut || amountOut;
      const executionAmountIn = routeInfo.routerAmountIn || amountIn;

      const txHash = await executeSwap({
        amountIn: isExactIn ? amountIn : executionAmountIn,
        amountOut: isExactIn ? executionAmountOut : amountOut,
        tokenIn,
        tokenOut,
        path: routeInfo.path,
        slippagePct,
        deadlineMins,
        isExactIn,
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
    const matches = (t: DexTokenDto) => !term || t.symbol.toLowerCase().includes(term) || (t.address || '').toLowerCase().includes(term);
    const ae = tokens.find((t) => t.is_ae);
    const wae = tokens.find((t) => t.address === CONFIG.DEX_WAE);
    const rest = tokens.filter((t) => t !== ae && t !== wae).filter(matches);
    const out: DexTokenDto[] = [];
    if (ae && matches(ae)) out.push(ae);
    if (wae && matches(wae)) out.push(wae);
    out.push(...rest);
    return out;
  }, [tokens, searchIn]);

  const filteredOutTokens = useMemo(() => {
    const term = searchOut.trim().toLowerCase();
    const matches = (t: DexTokenDto) => !term || t.symbol.toLowerCase().includes(term) || (t.address || '').toLowerCase().includes(term);
    const ae = tokens.find((t) => t.is_ae);
    const wae = tokens.find((t) => t.address === CONFIG.DEX_WAE);
    const rest = tokens.filter((t) => t !== ae && t !== wae).filter(matches);
    const out: DexTokenDto[] = [];
    if (ae && matches(ae)) out.push(ae);
    if (wae && matches(wae)) out.push(wae);
    out.push(...rest);
    return out;
  }, [tokens, searchOut]);

  const handleTokenSwap = () => {
    const tempToken = tokenIn;
    setTokenIn(tokenOut);
    setTokenOut(tempToken);
    setAmountIn(amountOut);
    setAmountOut('');
    setIsExactIn(true);

    // Update URL parameters to reflect the swapped tokens
    updateUrlParams(tokenOut, tempToken);
  };

  // Balance validation
  const hasInsufficientBalance = useMemo(() => {
    if (!address || !amountIn || !balances.in || Number(amountIn) <= 0) return false;
    try {
      return Decimal.from(amountIn).gt(Decimal.from(balances.in));
    } catch {
      return false;
    }
  }, [address, amountIn, balances.in]);

  // No liquidity detection
  const hasNoLiquidity = useMemo(() => {
    // Only show no liquidity warning if:
    // 1. We have both tokens selected
    // 2. We have a valid input amount > 0
    // 3. We're not currently loading a quote
    // 4. We don't have a general error (which might be a different issue)
    // 5. The output amount is 0 or empty after quoting OR liquidity is exceeded
    if (!tokenIn || !tokenOut || !amountIn || Number(amountIn) <= 0 || quoteLoading || error) {
      return false;
    }

    // Check if liquidity is exceeded
    if (routeInfo.liquidityStatus?.exceedsLiquidity) {
      return true;
    }

    // Check if we have a meaningful output amount
    const hasValidOutput = amountOut && Number(amountOut) > 0;

    // If we don't have a valid output and no route was found, it's likely no liquidity
    const hasNoRoute = routeInfo.path.length === 0;

    return !hasValidOutput || hasNoRoute;
  }, [tokenIn, tokenOut, amountIn, amountOut, quoteLoading, error, routeInfo.path.length, routeInfo.liquidityStatus]);

  const isSwapDisabled = useMemo(() => {
    const liquidityExceeded = routeInfo.liquidityStatus?.exceedsLiquidity === true;
    return swapLoading || quoteLoading || !!error || !amountIn || Number(amountIn) <= 0 || Number(amountOut) <= 0 || !amountOut || !tokenIn || !tokenOut || hasInsufficientBalance || routeInfo.path.length === 0 || hasNoLiquidity || liquidityExceeded;
  }, [swapLoading, quoteLoading, error, amountIn, amountOut, tokenIn, tokenOut, hasInsufficientBalance, routeInfo.path.length, hasNoLiquidity, routeInfo.liquidityStatus]);

  const updateInput = (value: string) => {
    setIsExactIn(true);
    setAmountIn(value);
    setAmountOut('');
  };
  const changeInputToken = (token: DexTokenDto) => { setTokenIn(token); setAmountOut(''); };
  const changeOutputToken = (token: DexTokenDto) => { setTokenOut(token); setAmountOut(''); };
  const hasQuote = !quoteLoading && !error && !hasNoLiquidity && Number(amountOut) > 0;
  const actionLabel = swapLoading ? t('swap.confirmInWallet')
    : quoteLoading ? t('swapCard.gettingQuote')
      : error ? t('swapCard.quoteUnavailable')
        : hasNoLiquidity ? t('swapCard.noRoute')
          : hasInsufficientBalance ? t('swapCard.insufficient')
            : !Number(amountIn) ? t('swapCard.enterAmount') : t('swapCard.review');

  return (
    <section className="dex-swap" aria-label={t('swapCard.title')}>
      <header className="dex-swap__header">
        <div><h2>{t('swapCard.title')}</h2><p>{t('swapCard.description')}</p></div>
        <button type="button" className={`swap-settings-trigger${settingsOpen ? ' is-open' : ''}`} disabled={swapLoading} aria-expanded={settingsOpen} aria-controls={settingsId} aria-label={t('swap.swapSettings')} onClick={() => setSettingsOpen(!settingsOpen)}>
          <Settings2 aria-hidden="true" /><span>{t('swap.settings')}</span>
        </button>
      </header>
      {settingsOpen && <SwapInlineSettings id={settingsId} onClose={() => setSettingsOpen(false)} />}
      <SwapAmountField
        pay token={tokenIn} otherToken={tokenOut} amount={amountIn} balance={balances.in}
        connected={!!address} onTokenChange={changeInputToken} onAmountChange={updateInput}
        tokens={filteredInTokens} disabled={swapLoading} loading={tokensLoading}
        search={searchIn} onSearch={setSearchIn} insufficient={hasInsufficientBalance}
      />
      <div className="swap-direction-wrap">
        <button type="button" className="swap-direction" aria-label={t('swapCard.reverse')} onClick={handleTokenSwap} disabled={swapLoading || !tokenIn || !tokenOut}>
          <ArrowDownUp aria-hidden="true" />
        </button>
      </div>
      <SwapAmountField
        token={tokenOut} otherToken={tokenIn} amount={hasQuote ? amountOut : ''} balance={balances.out}
        connected={!!address} onTokenChange={changeOutputToken}
        tokens={filteredOutTokens} disabled={swapLoading} loading={tokensLoading}
        search={searchOut} onSearch={setSearchOut}
      />
      {hasQuote ? (
        <SwapInfoDisplay tokenIn={tokenIn} tokenOut={tokenOut} amountIn={amountIn} amountOut={amountOut} routeInfo={routeInfo} tokens={tokens} onSettings={() => setSettingsOpen(true)} />
      ) : (
        <div className="swap-idle-settings">
          <span role="status">{quoteLoading ? t('swapCard.gettingQuote') : t('settings.slippageTolerance')}</span>
          <button type="button" disabled={swapLoading} onClick={() => setSettingsOpen(true)}>{slippagePct}%<Settings2 aria-hidden="true" /><span className="sr-only">{t('swap.swapSettings')}</span></button>
        </div>
      )}
      {(error || hasNoLiquidity || hasInsufficientBalance) && (
        <div className="swap-inline-state is-error" role="status">
          <Info aria-hidden="true" />
          <p>{error || (hasNoLiquidity ? t('swapCard.noLiquidityHint') : t('swap.insufficientBalance', {
            symbol: tokenIn?.symbol || '', needed: Decimal.from(amountIn || '0').prettify(), have: Decimal.from(balances.in || '0').prettify(),
          }))}
            {hasNoLiquidity && routeInfo.liquidityStatus?.maxAvailable && (
              <span>{t('noLiquidity.reduceAmount', { amount: Decimal.from(routeInfo.liquidityStatus.maxAvailable).prettify(), symbol: tokenIn?.symbol })}</span>
            )}
            {hasNoLiquidity && tokenIn && tokenOut && (
              <span><Link to={`/defi/pool?from=${tokenIn.is_ae ? 'AE' : tokenIn.address}&to=${tokenOut.is_ae ? 'AE' : tokenOut.address}`}>{t('noLiquidity.addLiquidity')}</Link></span>
            )}
          </p>
        </div>
      )}
      {address ? (
        <button type="button" className="swap-primary" onClick={() => setShowConfirm(true)} disabled={isSwapDisabled}>
          {swapLoading && <Spinner className="w-4 h-4" />}{actionLabel}{!isSwapDisabled && <ArrowRight aria-hidden="true" />}
        </button>
      ) : <ConnectWalletButton label={t('swapCard.connectWallet')} variant="swap" block />}
      <p className="swap-bottom-note">{t(address ? 'swapCard.reviewHint' : 'swapCard.walletHint')}</p>

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
        routeInfo={routeInfo}
        tokens={tokens}
        loading={swapLoading}
        swapStep={swapStep}
      />

    </section>
  );
}
