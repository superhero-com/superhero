import {
  useCallback, useEffect, useId, useMemo, useRef, useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight, Link2, Plus, Settings2,
} from 'lucide-react';
import Spinner from '@/components/Spinner';
import { CONFIG } from '../../../config';
import { ConnectWalletButton } from '../../../components/ConnectWalletButton';
import { useAddLiquidity } from '../hooks';
import { useTokenList } from '../../../components/dex/hooks/useTokenList';
import { useTokenBalances } from '../../../components/dex/hooks/useTokenBalances';
import { DexTokenDto, DexService } from '../../../api/generated';
import SwapAmountField from '../../../components/dex/core/SwapAmountField';
import SwapInlineSettings from '../../../components/dex/core/SwapInlineSettings';
import LiquidityConfirmation from './LiquidityConfirmation';
import LiquidityPreview from './LiquidityPreview';
import { Decimal } from '../../../libs/decimal';

import { useAccount, useDex } from '../../../hooks';
import { usePool } from '../context/PoolProvider';
import { linkedDeposit } from '../utils/liquidityEstimate';
import '../../../components/dex/core/SwapForm.css';
import './AddLiquidityForm.css';

const AddLiquidityForm = () => {
  const { t } = useTranslation('common');
  const { t: tDex } = useTranslation('dex');
  const { activeAccount: address } = useAccount();
  const { slippagePct, deadlineMins } = useDex();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    currentAction,
    selectedTokenA,
    selectedTokenB,
    clearSelection,
    onPositionUpdated,
  } = usePool();

  // Token list and balances
  const { tokens, loading: tokensLoading } = useTokenList();
  const [tokenA, setTokenA] = useState<DexTokenDto | null>(null);
  const [tokenB, setTokenB] = useState<DexTokenDto | null>(null);
  const { balances } = useTokenBalances(tokenA, tokenB);

  // Amounts and liquidity state
  const [amountA, setAmountA] = useState<string>('');
  const [amountB, setAmountB] = useState<string>('');
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');
  const [lastEdited, setLastEdited] = useState<'A' | 'B' | null>(null);

  // Liquidity hook
  const {
    state, setState, executeAddLiquidity, quoteStatus, computePairPreview,
  } = useAddLiquidity();

  const settingsId = useId();
  const settingsTrigger = useRef<HTMLButtonElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const closeSettings = () => { setShowSettings(false); settingsTrigger.current?.focus(); };

  // UI state
  const [showConfirm, setShowConfirm] = useState(false);

  // Helper function to find token by symbol or contract address
  const findToken = useCallback((identifier: string): DexTokenDto | null => {
    if (!identifier || !tokens.length) return null;

    // First try to find by symbol (case insensitive)
    const bySymbol = tokens.find(
      (token) => token.symbol.toLowerCase() === identifier.toLowerCase(),
    );
    if (bySymbol) return bySymbol;

    // Then try to find by contract address
    const byAddress = tokens.find(
      (token) => token.address === identifier || token.address === identifier.toLowerCase(),
    );
    if (byAddress) return byAddress;

    // For AE, check if it's the native token
    if (identifier.toLowerCase() === 'ae') {
      const aeToken = tokens.find((token) => token.is_ae);
      if (aeToken) return aeToken;
    }

    return null;
  }, [tokens]);

  // Function to fetch token metadata from middleware
  const fetchTokenFromMiddleware = useCallback(
    async (tokenAddress: string): Promise<DexTokenDto | null> => {
      try {
        const tokenResult = DexService.getDexTokenByAddress({ address: tokenAddress });
        return await tokenResult;
      } catch {
        return null;
      }
    },
    [],
  );

  // Helper function to find token by address or symbol
  const findTokenByAddressOrSymbol = useCallback(async (identifier: string): Promise<DexTokenDto | null> => {
    if (!identifier) return null;

    // If identifier is 'AE', find the AE token
    if (identifier === 'AE') {
      return tokens.find((token) => token.is_ae) || null;
    }

    // First, try to find in the local token list
    const token = tokens.find((tokenItem) => tokenItem.address === identifier);
    if (token) return token;

    // If not found locally and it looks like a contract address, fetch from middleware
    if (identifier.startsWith('ct_')) {
      return fetchTokenFromMiddleware(identifier);
    }

    return null;
  }, [tokens, fetchTokenFromMiddleware]);

  // Function to update URL parameters based on current token selection
  const updateUrlParams = useCallback((
    newTokenA: DexTokenDto | null,
    newTokenB: DexTokenDto | null,
  ) => {
    const searchParams = new URLSearchParams(location.search);

    // Update or remove 'from' parameter (tokenA)
    if (newTokenA) {
      const fromValue = newTokenA.is_ae ? 'AE' : newTokenA.address;
      searchParams.set('from', fromValue);
    } else {
      searchParams.delete('from');
    }

    // Update or remove 'to' parameter (tokenB)
    if (newTokenB) {
      const toValue = newTokenB.is_ae ? 'AE' : newTokenB.address;
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

      // Set tokenA based on URL param, context, or default
      if (fromParam && !tokenA) {
        const foundToken = await findTokenByAddressOrSymbol(fromParam);
        if (foundToken && !cancelled) {
          setTokenA(foundToken);
        }
      } else if (selectedTokenA && !tokenA) {
        // Fallback to context if no URL param
        const foundTokenA = findToken(selectedTokenA);
        if (foundTokenA && !cancelled) {
          setTokenA(foundTokenA);
        }
      } else if (!tokenA && !fromParam && !selectedTokenA) {
        // Default: AE as input token
        const ae = tokens.find((token) => token.is_ae) || null;
        setTokenA(ae || tokens[0] || null);
      }

      // Set tokenB based on URL param, context, or default
      if (toParam && !tokenB) {
        const foundToken = await findTokenByAddressOrSymbol(toParam);
        if (foundToken && !cancelled) {
          setTokenB(foundToken);
        }
      } else if (selectedTokenB && !tokenB) {
        // Fallback to context if no URL param
        const foundTokenB = findToken(selectedTokenB);
        if (foundTokenB && !cancelled) {
          setTokenB(foundTokenB);
        }
      } else if (!tokenB && !toParam && !selectedTokenB) {
        // Default: WTT as output token when no URL param provided
        const wtt = await findTokenByAddressOrSymbol(defaultToAddress);
        if (wtt && !cancelled) {
          setTokenB(wtt);
        }
      }
    };

    initializeTokens();

    // eslint-disable-next-line consistent-return
    return () => {
      cancelled = true;
    };
  }, [
    tokens,
    location.search,
    tokenA,
    tokenB,
    selectedTokenA,
    selectedTokenB,
    findTokenByAddressOrSymbol,
    findToken,
  ]);

  // Sync tokens from Pool context when a position is selected for adding liquidity
  useEffect(() => {
    if (!tokens.length) return;
    if (currentAction !== 'add') return;

    const nextA = selectedTokenA ? findToken(selectedTokenA) : null;
    const nextB = selectedTokenB ? findToken(selectedTokenB) : null;

    const currentAId = tokenA?.is_ae ? 'AE' : tokenA?.address;
    const currentBId = tokenB?.is_ae ? 'AE' : tokenB?.address;
    const nextAId = nextA?.is_ae ? 'AE' : nextA?.address;
    const nextBId = nextB?.is_ae ? 'AE' : nextB?.address;

    if (nextA && nextAId !== currentAId) {
      setTokenA(nextA);
    }
    if (nextB && nextBId !== currentBId) {
      setTokenB(nextB);
    }
  }, [tokens, currentAction, selectedTokenA, selectedTokenB, tokenA, tokenB, findToken]);

  // Update URL parameters when tokens change (after initial load)
  useEffect(() => {
    // Skip URL updates during initial load or when tokens are being set from URL params
    if (!tokens.length || !tokenA || !tokenB) return;

    // Only update URL if we have at least one token selected and tokens are loaded
    if (tokenA || tokenB) {
      updateUrlParams(tokenA, tokenB);
    }
  }, [tokenA, tokenB, tokens.length, updateUrlParams]);

  useEffect(() => {
    setAmountA('');
    setAmountB('');
    setLastEdited(null);
    setState((prev) => ({ ...prev, error: null }));
  }, [tokenA?.address, tokenB?.address, setState]);

  // Update hook state when tokens change
  useEffect(() => {
    // For AE tokens, use 'AE' as the address for the hook state
    const tokenAAddress = tokenA?.is_ae ? 'AE' : tokenA?.address || '';
    const tokenBAddress = tokenB?.is_ae ? 'AE' : tokenB?.address || '';

    setState((prev) => ({
      ...prev,
      tokenA: tokenAAddress,
      tokenB: tokenBAddress,
      symbolA: tokenA?.symbol || '',
      symbolB: tokenB?.symbol || '',
      decA: tokenA?.decimals ?? 18,
      decB: tokenB?.decimals ?? 18,
    }));
  }, [tokenA, tokenB, setState]);

  // Update hook state when amounts change
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      amountA,
      amountB,
    }));
  }, [amountA, amountB, setState]);

  const pairMatches = state.tokenA === (tokenA?.is_ae ? 'AE' : tokenA?.address)
    && state.tokenB === (tokenB?.is_ae ? 'AE' : tokenB?.address);
  const poolReady = pairMatches && quoteStatus === 'ready';
  const poolRatio = poolReady && state.pairExists ? state.pairPreview?.ratioAinB : undefined;

  useEffect(() => {
    if (!poolRatio) return;
    if (lastEdited === 'A') {
      const next = linkedDeposit(amountA, poolRatio, tokenB?.decimals ?? 18, 'A');
      if (next !== null) setAmountB(next);
    } else if (lastEdited === 'B') {
      const next = linkedDeposit(amountB, poolRatio, tokenA?.decimals ?? 18, 'B');
      if (next !== null) setAmountA(next);
    }
  }, [poolRatio, lastEdited, amountA, amountB, tokenA?.decimals, tokenB?.decimals]);

  const handleAmountAChange = (value: string) => {
    setLastEdited('A');
    setAmountA(value);
    if (poolRatio) setAmountB(linkedDeposit(value, poolRatio, tokenB?.decimals ?? 18, 'A') ?? '');
    setState((prev) => ({ ...prev, error: null }));
  };
  const handleAmountBChange = (value: string) => {
    setLastEdited('B');
    setAmountB(value);
    if (poolRatio) setAmountA(linkedDeposit(value, poolRatio, tokenA?.decimals ?? 18, 'B') ?? '');
    setState((prev) => ({ ...prev, error: null }));
  };
  const selectToken = (side: 'A' | 'B', token: DexTokenDto) => {
    if (side === 'A') setTokenA(token); else setTokenB(token);
    setAmountA('');
    setAmountB('');
    setLastEdited(null);
    setState((prev) => ({ ...prev, error: null }));
  };

  const filteredTokensA = useMemo(() => {
    const term = searchA.trim().toLowerCase();
    const matches = (token: DexTokenDto) => !term
      || token.symbol.toLowerCase().includes(term)
      || (token.address || '').toLowerCase().includes(term);
    const ae = tokens.find((token) => token.is_ae);
    const wae = tokens.find((token) => token.address === CONFIG.DEX_WAE);
    const rest = tokens.filter((token) => token !== ae && token !== wae).filter(matches);
    const out: DexTokenDto[] = [];
    if (ae && matches(ae)) out.push(ae);
    if (wae && matches(wae)) out.push(wae);
    out.push(...rest);
    return out;
  }, [tokens, searchA]);

  const filteredTokensB = useMemo(() => {
    const term = searchB.trim().toLowerCase();
    const matches = (token: DexTokenDto) => !term
      || token.symbol.toLowerCase().includes(term)
      || (token.address || '').toLowerCase().includes(term);
    const ae = tokens.find((token) => token.is_ae);
    const wae = tokens.find((token) => token.address === CONFIG.DEX_WAE);
    const rest = tokens.filter((token) => token !== ae && token !== wae).filter(matches);
    const out: DexTokenDto[] = [];
    if (ae && matches(ae)) out.push(ae);
    if (wae && matches(wae)) out.push(wae);
    out.push(...rest);
    return out;
  }, [tokens, searchB]);

  // Balance validation
  const hasInsufficientBalanceA = useMemo(() => {
    if (!amountA || !balances.in || Number(amountA) <= 0) return false;
    try {
      return Decimal.from(amountA).gt(Decimal.from(balances.in));
    } catch {
      return false;
    }
  }, [amountA, balances.in]);

  const hasInsufficientBalanceB = useMemo(() => {
    if (!amountB || !balances.out || Number(amountB) <= 0) return false;
    try {
      return Decimal.from(amountB).gt(Decimal.from(balances.out));
    } catch {
      return false;
    }
  }, [amountB, balances.out]);

  const hasInsufficientBalance = hasInsufficientBalanceA || hasInsufficientBalanceB;

  const isAddDisabled = state.loading
    || !poolReady
    || state.amountA !== amountA || state.amountB !== amountB
    || !amountA
    || Number(amountA) <= 0
    || !amountB
    || Number(amountB) <= 0
    || !tokenA
    || !tokenB
    || !!state.error
    || hasInsufficientBalance;

  const handleAddLiquidity = async () => {
    if (!tokenA || !tokenB || isAddDisabled) return;

    // Close the confirmation dialog immediately; the banner handles ongoing state.
    setShowConfirm(false);

    try {
      const txHash = await executeAddLiquidity({
        tokenA: tokenA.is_ae ? 'AE' : tokenA.address,
        tokenB: tokenB.is_ae ? 'AE' : tokenB.address,
        symbolA: tokenA.symbol,
        symbolB: tokenB.symbol,
        amountA,
        amountB,
        slippagePct,
        deadlineMins,
        isAePair: tokenA.is_ae || tokenB.is_ae || tokenA.address === 'AE' || tokenB.address === 'AE',
      });

      if (txHash) {
        setAmountA('');
        setAmountB('');

        if (currentAction === 'add') {
          clearSelection();
        }

        await onPositionUpdated();
      }
    } catch {
      // Errors are surfaced through the notification banner.
    }
  };

  let actionLabel = tDex('poolAdd.review');
  if (state.loading) actionLabel = t('buttons.confirmInWallet');
  else if (!tokenA || !tokenB) actionLabel = tDex('poolAdd.selectTokens');
  else if ((tokenA.is_ae ? CONFIG.DEX_WAE : tokenA.address) === (tokenB.is_ae ? CONFIG.DEX_WAE : tokenB.address)) actionLabel = tDex('poolAdd.differentTokens');
  else if (!pairMatches || quoteStatus === 'loading') actionLabel = tDex('poolAdd.checking');
  else if (quoteStatus === 'error') actionLabel = tDex('poolAdd.unavailable');
  else if (hasInsufficientBalance) actionLabel = tDex('poolAdd.notEnough', { symbol: hasInsufficientBalanceA ? tokenA.symbol : tokenB.symbol });
  else if (!amountA || !amountB || Number(amountA) <= 0 || Number(amountB) <= 0) actionLabel = tDex('poolAdd.enterAmounts');

  useEffect(() => { setShowConfirm(false); }, [address, tokenA, tokenB]);

  return (
    <section className="dex-swap pool-add" aria-label={tDex('poolAdd.title')}>
      <header className="dex-swap__header">
        <div>
          <h2>{tDex('poolAdd.title')}</h2>
          <p>{tDex('poolAdd.description')}</p>
        </div>
        <div className="pool-add__header-actions">
          {currentAction === 'add' && <button type="button" className="pool-add__cancel" onClick={clearSelection}>{tDex('poolAdd.cancel')}</button>}
          <button ref={settingsTrigger} type="button" className={`swap-settings-trigger${showSettings ? ' is-open' : ''}`} disabled={state.loading} aria-label={t('titles.liquiditySettings')} aria-expanded={showSettings} aria-controls={settingsId} onClick={() => setShowSettings(!showSettings)}>
            <Settings2 aria-hidden="true" />
            <span>{tDex('poolAdd.settings')}</span>
          </button>
        </div>
      </header>
      {showSettings && <SwapInlineSettings id={settingsId} title={t('titles.liquiditySettings')} hint={tDex('poolAdd.slippageHint')} onClose={closeSettings} />}
      <SwapAmountField
        pay
        label={tDex('poolAdd.deposit', { symbol: tokenA?.symbol || '' })}
        hint={lastEdited === 'B' && poolRatio && amountA ? tDex('poolAdd.linked') : tokenA?.name}
        selectorLabel={tDex('poolAdd.selectFirst')}
        token={tokenA}
        otherToken={tokenB}
        amount={amountA}
        balance={balances.in}
        connected={!!address}
        onTokenChange={(token) => selectToken('A', token)}
        onAmountChange={handleAmountAChange}
        tokens={filteredTokensA}
        disabled={state.loading}
        loading={tokensLoading}
        search={searchA}
        onSearch={setSearchA}
        insufficient={!!address && hasInsufficientBalanceA}
      />
      <div className="pool-link"><span><Plus aria-hidden="true" /></span></div>
      <SwapAmountField
        pay
        label={tDex('poolAdd.deposit', { symbol: tokenB?.symbol || '' })}
        hint={lastEdited === 'A' && poolRatio && amountB ? tDex('poolAdd.linked') : tokenB?.name}
        selectorLabel={tDex('poolAdd.selectSecond')}
        token={tokenB}
        otherToken={tokenA}
        amount={amountB}
        balance={balances.out}
        connected={!!address}
        onTokenChange={(token) => selectToken('B', token)}
        onAmountChange={handleAmountBChange}
        tokens={filteredTokensB}
        disabled={state.loading}
        loading={tokensLoading}
        search={searchB}
        onSearch={setSearchB}
        insufficient={!!address && hasInsufficientBalanceB}
      />
      <p className="pool-link-hint">
        <Link2 aria-hidden="true" />
        {tDex(poolReady && !state.pairExists ? 'poolAdd.startingHint' : 'poolAdd.ratioHint')}
      </p>
      <LiquidityPreview
        preview={poolReady ? state.pairPreview : null}
        tokenA={tokenA}
        tokenB={tokenB}
        pairExists={state.pairExists}
        status={pairMatches ? quoteStatus : 'loading'}
        amountA={amountA}
        amountB={amountB}
        slippagePct={slippagePct}
        deadlineMins={deadlineMins}
        onRetry={() => { computePairPreview(); }}
        onSettings={() => setShowSettings(true)}
      />
      {state.error && <div className="swap-inline-state is-error" role="alert">{state.error}</div>}
      {address && hasInsufficientBalance && <div className="swap-inline-state is-error" role="status">{tDex('poolAdd.notEnough', { symbol: hasInsufficientBalanceA ? tokenA?.symbol : tokenB?.symbol })}</div>}
      {address ? (
        <button type="button" onClick={() => setShowConfirm(true)} disabled={isAddDisabled} className="swap-primary">
          {state.loading && <Spinner className="w-4 h-4" />}
          {actionLabel}
          {!isAddDisabled && <ArrowRight aria-hidden="true" />}
        </button>
      ) : <ConnectWalletButton label={t('buttons.connectWalletDex')} variant="swap" className="swap-primary" block />}
      <p className="swap-bottom-note">{tDex(address ? 'poolAdd.confirmHint' : 'poolAdd.connectHint')}</p>
      <LiquidityConfirmation
        show={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleAddLiquidity}
        tokenA={tokenA}
        tokenB={tokenB}
        amountA={amountA}
        amountB={amountB}
        slippagePct={slippagePct}
        deadlineMins={deadlineMins}
        pairPreview={state.pairPreview}
        loading={state.loading}
        disabled={isAddDisabled}
      />
    </section>
  );
};

export default AddLiquidityForm;
