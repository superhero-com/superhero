import { TokenDto } from '@/api/generated/models/TokenDto';
import type { TokenPriceMovementDto } from '@/api/generated/models/TokenPriceMovementDto';
import { useQuery } from '@tanstack/react-query';
import {
  useEffect, useMemo, useRef, useState, type PointerEvent,
} from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useIsMobile } from '@/hooks';
import {
  BarChart3,
  Clock,
  Flame,
  Info,
  Lock,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react';
import TokenCandlestickChart from '@/components/charts/TokenCandlestickChart';
import { TokenLineChart } from '@/features/trending/components/TokenLineChart';
import { Head } from '../../../seo/Head';
import { TokensService } from '../../../api/generated/services/TokensService';
import { useOwnedTokens } from '../../../hooks/useOwnedTokens';
import TokenNotFound from '../../../components/TokenNotFound';

import LatestTransactionsCarousel from '../../../components/Trendminer/LatestTransactionsCarousel';
import Token24hChange from '../../../components/Trendminer/Token24hChange';
import TokenChat from '../../../components/Trendminer/TokenChat';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Card,
} from '../../../components/ui/card';
import ShareModal from '../../../components/ui/ShareModal';

// Feature components
import TokenCandlestickChartSkeleton from '../components/Skeletons/TokenCandlestickChartSkeleton';
import TokenSaleSidebarSkeleton from '../components/Skeletons/TokenSaleSidebarSkeleton';
import TokenRanking from '../components/TokenRanking/TokenRanking';
import TokenTradeCard from '../components/TokenTradeCard';
import { TokenSummary } from '../../bcl/components';
import { useLiveTokenData } from '../hooks/useLiveTokenData';
import { useTokenTradeStore } from '../hooks/useTokenTradeStore';
import {
  TokenFeedTab,
  TokenHoldersTab,
  TokenInfoTab,
  TokenTradeTab,
  TokenTransactionsTab,
} from '../components/tabs';

// Tab constants
const TAB_DETAILS = 'details';
const TAB_CHAT = 'posts';
const TAB_TRADE = 'trade';
const TAB_TRANSACTIONS = 'transactions';
const TAB_HOLDERS = 'holders';

type TabType =
  | typeof TAB_DETAILS
  | typeof TAB_CHAT
  | typeof TAB_TRADE
  | typeof TAB_TRANSACTIONS
  | typeof TAB_HOLDERS;

// .
const TokenSaleDetails = () => {
  const { tokenName } = useParams<{ tokenName: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState<TabType>(TAB_CHAT);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeployedMessage, setShowDeployedMessage] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [tradeActionSheet, setTradeActionSheet] = useState(false);
  const [pendingLastsLong, setPendingLastsLong] = useState(false);
  const isMobile = useIsMobile();
  const [showTradePanels, setShowTradePanels] = useState(() => {
    const params = new URLSearchParams(location.search);
    const showTradeParam = params.get('showTrade');
    if (showTradeParam === null) return true;
    const normalized = showTradeParam.toLowerCase();
    return !(normalized === '0' || normalized === 'false' || normalized === 'off');
  });
  const { ownedTokens } = useOwnedTokens();
  const [holdersOnly, setHoldersOnly] = useState(true);
  const [popularWindow, setPopularWindow] = useState<'24h' | '7d' | 'all'>('24h');
  const [showComposer, setShowComposer] = useState(false);
  const tradePrefillAppliedRef = useRef(false);
  const tradeTouchHandledRef = useRef(false);
  const tabAutoScrollInitRef = useRef(false);
  const {
    switchTradeView,
    updateTokenA,
    updateTokenB,
    updateTokenAFocused,
  } = useTokenTradeStore();

  const closeTradeActionSheet = () => {
    setTradeActionSheet(false);
    const params = new URLSearchParams(location.search);
    if (params.has('openTrade')) {
      params.delete('openTrade');
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    }
  };

  // Ensure token page starts at top on mount
  useEffect(() => {
    try { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); } catch { window.scrollTo(0, 0); }
  }, []);

  // On tab change, auto-scroll to top (skip initial render)
  useEffect(() => {
    if (!tabAutoScrollInitRef.current) {
      tabAutoScrollInitRef.current = true;
      return;
    }
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { window.scrollTo(0, 0); }
  }, [activeTab]);

  useEffect(() => {
    tradePrefillAppliedRef.current = false;
  }, [tokenName]);

  useEffect(() => {
    setShowComposer(!isMobile);
  }, [tokenName, isMobile]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const showTradeParam = params.get('showTrade');
    if (showTradeParam === null) {
      setShowTradePanels(true);
      return;
    }
    const normalized = showTradeParam.toLowerCase();
    setShowTradePanels(!(normalized === '0' || normalized === 'false' || normalized === 'off'));
  }, [location.search, tokenName]);

  useEffect(() => {
    if (!showTradePanels) {
      setTradeActionSheet(false);
    }
  }, [showTradePanels]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openTrade = params.get('openTrade');
    if (openTrade === '1' && showTradePanels) {
      if (isMobile) {
        setTradeActionSheet(true);
      }
    }
  }, [location.search, showTradePanels, isMobile]);

  // Check if token is newly created (from local storage or state)
  const isTokenNewlyCreated = useMemo(() => {
    try {
      const recentTokens = JSON.parse(
        localStorage.getItem('recentlyCreatedTokens') || '[]',
      );
      return recentTokens.includes(tokenName);
    } catch {
      return false;
    }
  }, [tokenName]);

  // Token data query
  const {
    isError,
    isLoading,
    data: _token,
    error,
  } = useQuery<TokenDto | null>({
    queryKey: ['TokensService.findByAddress', tokenName],
    queryFn: async () => {
      if (!tokenName) throw new Error('Token name is required');
      try {
        const result = await TokensService.findByAddress({ address: tokenName.toUpperCase() });
        if (!result) {
          throw new Error('Token not found');
        }
        return result;
      } catch (err) {
        console.error('Error fetching token:', err);
        throw new Error('Token not found');
      }
    },
    retry: (failureCount) => {
      if (failureCount > 3) {
        setPendingLastsLong(true);
      }
      return isTokenNewlyCreated ? true : failureCount <= 3;
    },
    retryDelay: 5000,
    staleTime: 60000,
    enabled: !!tokenName,
  });

  const { tokenData } = useLiveTokenData({ token: _token });

  const token = useMemo(() => ({
    ..._token,
    ...(tokenData || {}),
  }), [tokenData, _token]);
  const tokenAddress = (token as any)?.sale_address || (token as any)?.address;

  const { data: tokenPerformance } = useQuery<TokenPriceMovementDto>({
    queryKey: ['TokensService.performance', token?.sale_address],
    queryFn: () => TokensService.performance({ address: String(token?.sale_address || '') }),
    enabled: !!token?.sale_address,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });

  const tokenHeaderTitle = useMemo(() => {
    const raw = String(token?.symbol || token?.name || tokenName || '');
    return raw ? `#${raw.toUpperCase()}` : '#TOKEN';
  }, [token?.symbol, token?.name, tokenName]);
  const openTradePanel = () => {
    const params = new URLSearchParams(location.search);
    params.set('showTrade', '1');
    params.set('openTrade', '1');
    navigate({ pathname: location.pathname, search: params.toString() });
  };
  const ensureTradePanelsVisible = () => {
    const params = new URLSearchParams(location.search);
    const showTradeParam = params.get('showTrade');
    const normalized = (showTradeParam || '').toLowerCase();
    if (showTradeParam && (normalized === '0' || normalized === 'false' || normalized === 'off')) {
      params.set('showTrade', '1');
    }
    if (params.has('openTrade')) params.delete('openTrade');
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    setShowTradePanels(true);
  };
  const handleTradeClick = () => {
    if (tradeTouchHandledRef.current) {
      tradeTouchHandledRef.current = false;
      return;
    }
    openTradePanel();
  };
  const handleTradePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== 'touch') return;
    tradeTouchHandledRef.current = true;
    openTradePanel();
  };
  const openTradeFor = (buy: boolean) => {
    switchTradeView(buy);
    openTradePanel();
  };

  // Derived states
  const isTokenPending = isTokenNewlyCreated && !token?.sale_address;

  useEffect(() => {
    if (tradePrefillAppliedRef.current) return;
    const params = new URLSearchParams(location.search);
    const tradeType = params.get('trade');
    const amountRaw = params.get('amount');
    if (tradeType !== 'buy' || !amountRaw) return;
    const amount = Number(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (!showTradePanels) return;
    switchTradeView(true);
    updateTokenA(undefined);
    updateTokenB(amount);
    updateTokenAFocused(false);
    tradePrefillAppliedRef.current = true;
    if (isMobile) {
      setTradeActionSheet(true);
    }
  }, [location.search, isMobile, switchTradeView, updateTokenA, updateTokenB, updateTokenAFocused, showTradePanels]);

  // Share URL
  const shareUrl = useMemo(() => window.location.href, []);

  // Check if user owns this token
  const ownsThisToken = useMemo(() => {
    if (!token || !ownedTokens?.length) return false;

    // `useOwnedTokens` returns the nested `row.token` objects from
    // `/api/accounts/{address}/tokens`, so we can match directly by address.
    const tokenAddressValue = String((token as any)?.address || '').toLowerCase();
    const tokenSaleAddress = String((token as any)?.sale_address || '').toLowerCase();
    const target = tokenSaleAddress || tokenAddressValue;
    if (!target) return false;

    return ownedTokens.some((t: any) => {
      const addr = String(t?.address || '').toLowerCase();
      const sale = String(t?.sale_address || '').toLowerCase();
      return addr === target || sale === target;
    });
  }, [token, ownedTokens]);

  // Check if token doesn't exist (but don't block the UI)
  const tokenDoesNotExist = isError && !isTokenNewlyCreated && !isLoading;

  // Switch to an available tab if token doesn't exist and current tab requires token
  useEffect(() => {
    if (tokenDoesNotExist) {
      const lockedTabs = [TAB_TRADE, TAB_TRANSACTIONS, TAB_HOLDERS];
      if (lockedTabs.includes(activeTab)) {
        setActiveTab(TAB_CHAT);
      }
    }
  }, [tokenDoesNotExist, activeTab]);

  // Render pending state
  if (isTokenPending) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <Head
          title={`Buy #${tokenName} on Superhero.com`}
          description={`Explore ${tokenName} token, trades, holders and posts.`}
          canonicalPath={`/trends/tokens/${tokenName}`}
        />
        {!isMobile && showTradePanels && <LatestTransactionsCarousel />}

        <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-2">
            Token Creation Pending...
          </h2>
          <p className="text-white/70">
            {pendingLastsLong
              ? 'Oops, the miners seem to be busy at the moment. The creation might take a bit longer than expected.'
              : 'Your transaction has been sent to the network. Waiting for it to be picked up and mined.'}
          </p>
          <div className="w-full bg-white/10 rounded-full h-2 mt-4">
            <div className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] h-2 rounded-full animate-pulse w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[min(1536px,100%)] mx-auto min-h-screen  text-white px-4">
      <Head
        title={tokenDoesNotExist
          ? `Create #${tokenName} Token on Superhero.com`
          : `Buy #${token?.symbol || token?.name || tokenName} on Superhero.com`}
        description={tokenDoesNotExist
          ? `Token #${tokenName} doesn't exist yet. Be the first to create it and start building a community!`
          : (token?.metaInfo?.description || `Explore ${token?.symbol || token?.name || tokenName} token, trades, holders and posts.`).slice(0, 160)}
        canonicalPath={`/trends/tokens/${tokenName}`}
        jsonLd={tokenDoesNotExist ? undefined : {
          '@context': 'https://schema.org',
          '@type': 'CryptoCurrency',
          name: token?.name || token?.symbol || tokenName,
          symbol: token?.symbol,
          identifier: token?.address || token?.sale_address,
        }}
      />
      {!isMobile && showTradePanels && <LatestTransactionsCarousel />}

      {isMobile && (
        <div className="sticky top-[calc(var(--mobile-navigation-height)+env(safe-area-inset-top))] z-[1000] -mx-4 mb-3 border-b border-white/10 bg-[#0a0a0f]/70 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
          <div className="pt-2 pb-2">
            <div className="overflow-x-auto px-3">
              <div className="flex items-center gap-4 min-w-max">
                {[
                  { id: TAB_CHAT, label: 'Feed', Icon: Flame, requiresToken: false },
                  { id: TAB_TRADE, label: 'Trade', Icon: BarChart3, requiresToken: true },
                  { id: TAB_DETAILS, label: 'Info', Icon: Info, requiresToken: false },
                  { id: TAB_TRANSACTIONS, label: 'Transactions', Icon: TrendingUp, requiresToken: true },
                  { id: TAB_HOLDERS, label: 'Holders', Icon: Users, requiresToken: true },
                ].map((tab) => {
                  const isActive = activeTab === tab.id;
                  const isDisabled = tokenDoesNotExist && tab.requiresToken;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        if (isDisabled) return;
                        if (tab.id === TAB_TRADE) {
                          ensureTradePanelsVisible();
                        }
                        setActiveTab(tab.id as TabType);
                      }}
                      className={`pb-1 transition-colors ${
                        isDisabled
                          ? 'border-b-2 border-transparent cursor-not-allowed opacity-50'
                          : isActive
                            ? 'border-b-2 border-[#4ecdc4]'
                            : 'border-b-2 border-transparent'
                      }`}
                      title={isDisabled ? 'Create the token to unlock this feature' : undefined}
                    >
                      <span className="flex items-center gap-1">
                        {isDisabled ? (
                          <Lock className="h-3.5 w-3.5 text-white/30" />
                        ) : (
                          <tab.Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-white/60'}`} />
                        )}
                        <span className={`text-xs ${
                          isDisabled
                            ? 'text-white/30'
                            : isActive
                              ? 'font-semibold text-white'
                              : 'text-white/60'
                        }`}>
                          {tab.label}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deploy Success Message */}
      {showDeployedMessage && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
              ✓
            </div>
            <div>
              <h3 className="font-semibold text-green-400">
                Token Deployed Successfully!
              </h3>
              <p className="text-green-300/70 text-sm">
                Your token is now live on the blockchain.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeployedMessage(false)}
            className="text-green-400 hover:text-green-300"
          >
            ×
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content (Left Column on Desktop, Full Width on Mobile) */}
        <div
          className={`${isMobile ? 'col-span-1 mb-8' : 'lg:col-span-2 lg:col-start-1'
          } flex flex-col gap-6`}
        >
          {/* Token Header */}
          {!isMobile && (
            <Card className="bg-white/[0.02] border-white/10">
              <div className="p-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                      <span className="text-[.9em] mr-0.5 align-baseline">#</span>
                      <span>{token?.symbol || token?.name || tokenName}</span>
                    </h1>

                    <div className="flex items-center gap-2 flex-wrap">
                      {tokenDoesNotExist ? (
                        <Badge
                          variant="secondary"
                          className="bg-gradient-to-r from-orange-600/80 to-red-700/80 text-white text-xs font-medium px-2.5 py-1 rounded-full border-0 shadow-sm"
                        >
                          NOT CREATED
                        </Badge>
                      ) : (
                        <>
                          {token?.rank && (
                            <Badge
                              variant="secondary"
                              className="bg-gradient-to-r from-slate-600/80 to-slate-700/80 text-white text-xs font-medium px-2.5 py-1 rounded-full border-0 shadow-sm"
                            >
                              RANK #
                              {token.rank}
                            </Badge>
                          )}
                          {ownsThisToken && (
                            <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-medium px-2.5 py-1 rounded-full border-0 shadow-sm">
                              OWNED
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!tokenDoesNotExist && token?.sale_address && (
                      <Token24hChange
                        tokenAddress={token.address || token.sale_address}
                        createdAt={token.created_at}
                        performance24h={tokenPerformance?.past_24h ?? null}
                      />
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowShareModal(true)}
                      className="border-white/20 bg-white/5 text-white hover:bg-white/10 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
                    >
                      🔗
                    </Button>
                  </div>
                </div>

                {/* Description */}
                {!isLoading && !isTokenPending && !tokenDoesNotExist && token?.metaInfo?.description && (
                  <div className="text-white/75 text-sm leading-relaxed mt-3 max-w-[720px]">
                    <span>
                      {descriptionExpanded
                        || !isMobile
                        || token.metaInfo.description.length <= 150
                        ? token.metaInfo.description
                        : `${token.metaInfo.description.substring(0, 150)}...`}
                    </span>
                    {isMobile && token.metaInfo.description.length > 150 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                        className="text-purple-400 hover:text-white ml-2 p-0 h-auto font-medium underline-offset-2 hover:underline"
                      >
                        {descriptionExpanded ? 'Show Less' : 'Show More'}
                      </Button>
                    )}
                  </div>
                )}
                {tokenDoesNotExist && (
                  <div className="text-white/50 text-sm leading-relaxed mt-3 max-w-[720px] italic">
                    This token hasn&apos;t been created yet. You can be the first to create it and share what it&apos;s all about!
                  </div>
                )}
              </div>
            </Card>
          )}

          {!isMobile && !showTradePanels && tokenAddress && !tokenDoesNotExist && (
            <button
              type="button"
              onClick={handleTradeClick}
              onPointerUp={handleTradePointerUp}
              className="w-full rounded-2xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-transparent px-4 py-3 text-left shadow-[0_8px_24px_rgba(16,185,129,0.18)] transition-all duration-200 hover:border-emerald-300/60 hover:shadow-[0_10px_28px_rgba(16,185,129,0.28)] active:scale-[0.99]"
              aria-label="Open trade"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{tokenHeaderTitle}</span>
                <span className="text-emerald-400 text-sm font-semibold">▲</span>
              </div>
              <div className="mt-2 h-6 w-full">
                <TokenLineChart
                  saleAddress={String(tokenAddress)}
                  height={24}
                  hideTimeframe
                  showCrosshair
                  allTime
                  showDateLegend
                  allowParentClick
                  className="h-full w-full"
                />
              </div>
            </button>
          )}

          {/* Chart */}
          {showTradePanels && !isMobile && !tokenDoesNotExist && (
            (isLoading && !token?.sale_address) ? (
              <TokenCandlestickChartSkeleton boilerplate={isTokenPending} />
            ) : (
              <TokenCandlestickChart token={token} className="w-full" />
            )
          )}
          {/* Tabs Section */}
          {/* Tab Headers */}
          {!isMobile && (
            <div className="flex border-b border-white/10">
              <button
                type="button"
                onClick={() => setActiveTab(TAB_CHAT)}
                className={`flex-1 px-4 py-3 text-[10px] font-bold transition-colors ${activeTab === TAB_CHAT
                  ? 'text-white border-b-2 border-[#4ecdc4]'
                  : 'text-white/60 hover:text-white'
                }`}
              >
                <span className="flex items-center justify-center gap-1.5">
                  Posts
                </span>
              </button>
              <button
                type="button"
                disabled={tokenDoesNotExist}
                onClick={() => !tokenDoesNotExist && setActiveTab(TAB_TRANSACTIONS)}
                className={`flex-1 px-4 py-3 text-[10px] font-bold transition-colors ${
                  tokenDoesNotExist
                    ? 'text-white/30 cursor-not-allowed opacity-50'
                    : activeTab === TAB_TRANSACTIONS
                      ? 'text-white border-b-2 border-[#4ecdc4]'
                      : 'text-white/60 hover:text-white'
                }`}
                title={tokenDoesNotExist ? 'Create the token to unlock this feature' : undefined}
              >
                <span className="flex items-center justify-center gap-1.5">
                  {tokenDoesNotExist && <Lock className="h-3 w-3" />}
                  Transactions
                </span>
              </button>
              <button
                type="button"
                disabled={tokenDoesNotExist}
                onClick={() => !tokenDoesNotExist && setActiveTab(TAB_HOLDERS)}
                className={`flex-1 px-4 py-3 text-[10px] font-bold transition-colors ${
                  tokenDoesNotExist
                    ? 'text-white/30 cursor-not-allowed opacity-50'
                    : activeTab === TAB_HOLDERS
                      ? 'text-white border-b-2 border-[#4ecdc4]'
                      : 'text-white/60 hover:text-white'
                }`}
                title={tokenDoesNotExist ? 'Create the token to unlock this feature' : undefined}
              >
                <span className="flex items-center justify-center gap-1.5">
                  {tokenDoesNotExist && <Lock className="h-3 w-3" />}
                  Holders
                  {!tokenDoesNotExist && ` (${token?.holders_count || 0})`}
                </span>
              </button>
            </div>
          )}

          {/* Tab Content */}
          <div className={`p-0 md:p-1 ${isMobile ? 'mb-24 pb-4' : ''}`}>
            {isMobile && activeTab === TAB_DETAILS && (
              tokenDoesNotExist ? (
                <Card className="bg-white/[0.02] border-white/10 p-6">
                  <div className="text-center">
                    <div
                      className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                      style={{
                        background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.15) 0%, rgba(78, 205, 196, 0.15) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <svg
                        className="w-10 h-10 text-white/40"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">
                      Token Not Created Yet
                    </h3>
                    <p className="text-white/60 text-sm mb-4">
                      This token doesn&apos;t exist yet. Be the first to create it and start building a community!
                    </p>
                    <Button
                      size="lg"
                      onClick={() => {
                        const truncatedName = (tokenName || '').slice(0, 20);
                        navigate(`/trends/create?tokenName=${encodeURIComponent(truncatedName)}`);
                      }}
                      className="w-full px-6 py-5 text-sm font-bold rounded-xl transition-all duration-300 hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, var(--neon-teal) 0%, var(--neon-blue) 100%)',
                        color: '#0a0a0f',
                        border: 'none',
                      }}
                    >
                      Create This Token
                    </Button>
                  </div>
                </Card>
              ) : (
                <TokenInfoTab token={token} />
              )
            )}

            {isMobile && activeTab === TAB_TRADE && (
              tokenDoesNotExist ? (
                <Card className="bg-white/[0.02] border-white/10 p-6">
                  <div className="text-center">
                    <Lock className="w-16 h-16 mx-auto mb-4 text-white/20" />
                    <h3 className="text-lg font-bold text-white mb-2">
                      Trading Not Available
                    </h3>
                    <p className="text-white/60 text-sm mb-4">
                      Create the token first to enable trading.
                    </p>
                  </div>
                </Card>
              ) : (
                <TokenTradeTab
                  token={token}
                  tokenPerformance={tokenPerformance}
                  isLoading={isLoading}
                  isTokenPending={isTokenPending}
                  onBuy={() => openTradeFor(true)}
                  onSell={() => openTradeFor(false)}
                />
              )
            )}

            {activeTab === TAB_CHAT && (
              <TokenFeedTab
                token={token}
                isMobile={isMobile}
                showComposer={showComposer}
                holdersOnly={holdersOnly}
                setHoldersOnly={setHoldersOnly}
                popularWindow={popularWindow}
                setPopularWindow={setPopularWindow}
                showTradePanels={showTradePanels}
                setShowTradePanels={setShowTradePanels}
              />
            )}

            {activeTab === TAB_TRANSACTIONS && (
              tokenDoesNotExist ? (
                <Card className="bg-white/[0.02] border-white/10 p-6">
                  <div className="text-center">
                    <Lock className="w-16 h-16 mx-auto mb-4 text-white/20" />
                    <h3 className="text-lg font-bold text-white mb-2">
                      No Transactions Yet
                    </h3>
                    <p className="text-white/60 text-sm mb-4">
                      Create the token first to see transactions.
                    </p>
                  </div>
                </Card>
              ) : (
                <TokenTransactionsTab token={token} />
              )
            )}

            {activeTab === TAB_HOLDERS && (
              tokenDoesNotExist ? (
                <Card className="bg-white/[0.02] border-white/10 p-6">
                  <div className="text-center">
                    <Lock className="w-16 h-16 mx-auto mb-4 text-white/20" />
                    <h3 className="text-lg font-bold text-white mb-2">
                      No Holders Yet
                    </h3>
                    <p className="text-white/60 text-sm mb-4">
                      Create the token first to see holders.
                    </p>
                  </div>
                </Card>
              ) : (
                <TokenHoldersTab token={token} />
              )
            )}
          </div>
        </div>

        {/* Desktop Sidebar (Right Column) */}
        {!isMobile && (
          <div className="lg:col-span-1 lg:col-start-3 flex flex-col gap-6 lg:sticky lg:top-6 self-start">
            {tokenDoesNotExist ? (
              <Card className="bg-white/[0.02] border-white/10 p-6">
                <div className="text-center">
                  <div
                    className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.15) 0%, rgba(78, 205, 196, 0.15) 100%)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <svg
                      className="w-10 h-10 text-white/40"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    Create Token
                  </h3>
                  <p className="text-white/60 text-sm mb-4">
                    This token doesn&apos;t exist yet. Be the first to create it!
                  </p>
                  <Button
                    size="lg"
                    onClick={() => {
                      const truncatedName = (tokenName || '').slice(0, 20);
                      navigate(`/trends/create?tokenName=${encodeURIComponent(truncatedName)}`);
                    }}
                    className="w-full px-6 py-5 text-sm font-bold rounded-xl transition-all duration-300 hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, var(--neon-teal) 0%, var(--neon-blue) 100%)',
                      color: '#0a0a0f',
                      border: 'none',
                    }}
                  >
                    Create This Token
                  </Button>
                </div>
              </Card>
            ) : !token?.sale_address ? (
              <TokenSaleSidebarSkeleton />
            ) : (
              <>
                {showTradePanels && <TokenTradeCard token={token} />}
                <TokenSummary
                  token={token}
                />
                <TokenRanking token={token} />
                {/* Quali.chat CTA - old design cards */}
                <TokenChat
                  token={{
                    name: String(token.name || token.symbol || ''),
                    address: String((token as any).sale_address || (token as any).address || (token as any).token_address || ''),
                  }}
                  mode="ctaOnly"
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Mobile Trading Modal */}
      {(showTradePanels && tradeActionSheet && token?.sale_address) && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end">
          <div className="w-full max-h-[85vh] overflow-y-auto">
            <TokenTradeCard
              token={token}
              onClose={closeTradeActionSheet}
            />
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={shareUrl}
        title={`Share ${token?.name || token?.symbol || tokenName || 'Token'}`}
      />

      {isMobile && activeTab === TAB_CHAT && !showComposer && !tradeActionSheet && (
        <button
          type="button"
          onClick={() => setShowComposer(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(to right, var(--neon-teal), var(--neon-teal), #5eead4)',
            color: '#0a0a0f',
          }}
          aria-label="Add new post"
          title="Add new post"
        >
          <Plus className="w-5 h-5" style={{ color: '#0a0a0f' }} />
          <span className="text-sm font-semibold whitespace-nowrap" style={{ color: '#0a0a0f' }}>
            Add new post
          </span>
        </button>
      )}
    </div>
  );
};

export default TokenSaleDetails;
