import { TokenDto } from '@/api/generated/models/TokenDto';
import TokenCandlestickChart from '@/components/charts/TokenCandlestickChart';
import { useIsMobile } from '@/hooks';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Flame,
  Info,
  Lock,
  Plus,
  TrendingUp,
  Users,
} from 'lucide-react';
import {
  useEffect, useMemo, useRef, useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { collectionLabel } from '@/utils/collection';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { cn } from '@/lib/utils';

import { TokensService } from '../../../api/generated/services/TokensService';
import { useOwnedTokens } from '../../../hooks/useOwnedTokens';
import { Head } from '../../../seo/Head';

import LatestTransactionsCarousel from '../../../components/Trendminer/LatestTransactionsCarousel';
import TokenChange from '../../../components/Trendminer/TokenChange';
import TokenChat from '../../../components/Trendminer/TokenChat';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import {
  Card,
} from '../../../components/ui/card';
import ShareModal from '../../../components/ui/ShareModal';

// Feature components
import { CONFIG } from '../../../config';
import { TokenSummary } from '../../bcl/components';
import TokenCandlestickChartSkeleton from '../components/Skeletons/TokenCandlestickChartSkeleton';
import TokenSaleSidebarSkeleton from '../components/Skeletons/TokenSaleSidebarSkeleton';
import {
  TokenFeedTab,
  TokenHoldersTab,
  TokenInfoTab,
  TokenTradeTab,
  TokenTransactionsTab,
} from '../components/tabs';
import TokenCreationBanner from '../components/TokenCreationBanner';
import TokenRanking from '../components/TokenRanking/TokenRanking';
import TokenTradeCard from '../components/TokenTradeCard';
import { useLiveTokenData } from '../hooks/useLiveTokenData';
import { useTokenTradeStore } from '../hooks/useTokenTradeStore';

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
function tabBorderClass(disabled: boolean, active: boolean): string {
  if (disabled) return 'border-b-2 border-transparent cursor-not-allowed opacity-50';
  return active ? 'border-b-2 border-[#4ecdc4]' : 'border-b-2 border-transparent';
}

function tabLabelClass(disabled: boolean, active: boolean): string {
  if (disabled) return 'text-white/30';
  return active ? 'font-semibold text-white' : 'text-white/60';
}

function mobileTabBtnClass(tokenDoesNotExist: boolean, isActive: boolean): string {
  if (tokenDoesNotExist) return 'text-white/30 cursor-not-allowed opacity-50';
  return isActive ? 'text-white border-b-2 border-[#4ecdc4]' : 'text-white/60 hover:text-white';
}

const TokenSaleDetails = () => {
  const { t } = useTranslation();
  const { tokenName } = useParams<{ tokenName: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState<TabType>(TAB_CHAT);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDeployedMessage, setShowDeployedMessage] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [tradeActionSheet, setTradeActionSheet] = useState(false);

  const [showCreatedOverlay, setShowCreatedOverlay] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('created') === 'true';
  });
  const [txConfirmed, setTxConfirmed] = useState(false);
  const isMobile = useIsMobile();
  const [showTradePanels, setShowTradePanels] = useState(() => {
    const params = new URLSearchParams(location.search);
    const showTradeParam = params.get('showTrade');
    if (showTradeParam === null) return true;
    const normalized = showTradeParam.toLowerCase();
    return !(normalized === '0' || normalized === 'false' || normalized === 'off');
  });
  // We only need to know whether the user holds *this* token, so narrow the
  // account-tokens query by the trend name server-side instead of pulling the
  // whole portfolio. The address match in `ownsThisToken` keeps it precise even
  // if `search` matches fuzzily.
  const { ownedTokens } = useOwnedTokens({ search: tokenName });
  const [holdersOnly, setHoldersOnly] = useState(true);
  const [showComposer, setShowComposer] = useState(false);
  const tradePrefillAppliedRef = useRef(false);
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

  // Post-deploy flow: CreateTokenView navigates here with ?created=true (see also txHash).
  const isTokenNewlyCreated = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('created') === 'true';
  }, [location.search]);

  const txHash = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('txHash');
  }, [location.search]);

  // Token data query
  const {
    isError,
    isLoading,
    data: _token,
    refetch,
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
    retry: (failureCount) => (isTokenNewlyCreated ? true : failureCount <= 3),
    retryDelay: 10000,
    staleTime: 60000,
    enabled: !!tokenName,
  });

  const { tokenData } = useLiveTokenData({ token: _token });

  const token = useMemo(() => ({
    ..._token,
    ...(tokenData || {}),
  }), [tokenData, _token]);

  // Poll AE node every 5 seconds until transaction is mined (block_height !== -1)
  useEffect(() => {
    if (!txHash || txConfirmed) return () => { };

    const pollTx = async () => {
      try {
        const res = await fetch(
          `${CONFIG.NODE_URL}/v3/transactions/${txHash}?int-as-string=false`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.block_height !== undefined && data.block_height !== -1) {
          setTxConfirmed(true);
        }
      } catch { /* ignore network errors, keep polling */ }
    };

    pollTx();
    const interval = setInterval(pollTx, 5000);
    return () => clearInterval(interval);
  }, [txHash, txConfirmed]);

  // Poll every 5 seconds when the token was just created until it is available.
  // When txHash is present, wait for the transaction to be mined first.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('created') !== 'true') return () => { };
    if (token?.sale_address) return () => { };
    if (txHash && !txConfirmed) return () => { };

    const intervalId = setInterval(() => {
      refetch();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [location.search, token?.sale_address, refetch, txHash, txConfirmed]);

  // Handle successful token load after creation
  useEffect(() => {
    if (showCreatedOverlay && token?.sale_address && !isLoading) {
      // Token successfully loaded, hide overlay and remove query param
      setShowCreatedOverlay(false);
      const params = new URLSearchParams(location.search);
      if (params.get('created') === 'true') {
        params.delete('created');
        params.delete('txHash');
        navigate(
          { pathname: location.pathname, search: params.toString() },
          { replace: true },
        );
      }
    }
  }, [showCreatedOverlay, token?.sale_address, isLoading, location.pathname, location.search, navigate]);

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

    return ownedTokens.some((owned: any) => {
      const addr = String(owned?.address || '').toLowerCase();
      const sale = String(owned?.sale_address || '').toLowerCase();
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

  return (
    <div className="max-w-[min(1536px,100%)] mx-auto min-h-screen aurora-surface text-white px-4">
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
                  {
                    id: TAB_CHAT, label: t('trending.tokenSale.tabFeed'), Icon: Flame, requiresToken: false,
                  },
                  {
                    id: TAB_TRADE, label: t('trending.tokenSale.tabTrade'), Icon: BarChart3, requiresToken: true,
                  },
                  {
                    id: TAB_DETAILS, label: t('trending.tokenSale.tabInfo'), Icon: Info, requiresToken: false,
                  },
                  {
                    id: TAB_TRANSACTIONS, label: t('trending.tokenSale.tabTransactions'), Icon: TrendingUp, requiresToken: true,
                  },
                  {
                    id: TAB_HOLDERS, label: t('trending.tokenSale.tabHolders'), Icon: Users, requiresToken: true,
                  },
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
                      className={`pb-1 transition-colors ${tabBorderClass(isDisabled, isActive)}`}
                      title={isDisabled ? t('trending.tokenSale.createTokenToUnlock') : undefined}
                    >
                      <span className="flex items-center gap-1">
                        {isDisabled ? (
                          <Lock className="h-3.5 w-3.5 text-white/30" />
                        ) : (
                          <tab.Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : 'text-white/60'}`} />
                        )}
                        <span className={`text-xs ${tabLabelClass(isDisabled, isActive)}`}>
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
        <div className="bg-bull/10 border border-bull/30 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-bull flex items-center justify-center">
              ✓
            </div>
            <div>
              <h3 className="font-semibold text-bull">
                {t('trending.tokenSale.tokenDeployedSuccessfully')}
              </h3>
              <p className="text-bull/70 text-sm">
                {t('trending.tokenSale.tokenNowLive')}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeployedMessage(false)}
            className="text-bull hover:text-bull/80"
          >
            ×
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content (Left Column on Desktop, Full Width on Mobile) */}
        <div
          className={cn(isMobile ? 'col-span-1 mb-8' : 'lg:col-span-2 lg:col-start-1', 'flex flex-col gap-6')}
        >
          {/* Token Header */}
          {!isMobile && (
            <Card className="liquid-glass liquid-glass--strong rounded-xl">
              <div className="p-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
                      <span className="text-[.9em] mr-0.5 align-baseline">#</span>
                      <span className="gradient-text">{token?.symbol || token?.name || tokenName}</span>
                    </h1>

                    <div className="flex items-center gap-2 flex-wrap">
                      {collectionLabel((token as any)?.collection) && (
                        <Badge
                          variant="secondary"
                          className="bg-white/10 text-white/70 text-xs font-medium px-2.5 py-1 rounded-btn-sm border-0"
                        >
                          {collectionLabel((token as any)?.collection)}
                        </Badge>
                      )}
                      {tokenDoesNotExist ? (
                        <Badge
                          variant="secondary"
                          className="bg-gradient-to-r from-orange-600/80 to-red-700/80 text-white text-xs font-medium px-2.5 py-1 rounded-btn-sm border-0 shadow-sm"
                        >
                          {t('trending.tokenSale.badgeNotCreated')}
                        </Badge>
                      ) : (
                        <>
                          {token?.rank && (
                            <Badge
                              variant="secondary"
                              className="bg-gradient-to-r from-slate-600/80 to-slate-700/80 text-white text-xs font-medium px-2.5 py-1 rounded-btn-sm border-0 shadow-sm"
                            >
                              {t('trending.tokenSale.badgeRank', { rank: token.rank })}
                            </Badge>
                          )}
                          {ownsThisToken && (
                            <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-medium px-2.5 py-1 rounded-btn-sm border-0 shadow-sm">
                              {t('trending.tokenSale.badgeOwned')}
                            </Badge>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!tokenDoesNotExist && token?.sale_address && (
                      <TokenChange token={token} />
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
                        {descriptionExpanded ? t('trending.tokenSale.showLess') : t('trending.tokenSale.showMore')}
                      </Button>
                    )}
                  </div>
                )}
                {tokenDoesNotExist && (
                  <div className="text-white/50 text-sm leading-relaxed mt-3 max-w-[720px] italic">
                    {t('trending.tokenSale.tokenNotCreatedHeaderHint')}
                  </div>
                )}
              </div>
            </Card>
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
                className={cn(
                  'flex-1 px-4 py-3 text-[10px] font-bold transition-colors',
                  activeTab === TAB_CHAT ? 'text-white border-b-2 border-[#4ecdc4]' : 'text-white/60 hover:text-white',
                )}
              >
                <span className="flex items-center justify-center gap-1.5">
                  {t('trending.tokenSale.tabPosts')}
                </span>
              </button>
              <button
                type="button"
                disabled={tokenDoesNotExist}
                onClick={() => !tokenDoesNotExist && setActiveTab(TAB_TRANSACTIONS)}
                className={`flex-1 px-4 py-3 text-[10px] font-bold transition-colors ${mobileTabBtnClass(tokenDoesNotExist, activeTab === TAB_TRANSACTIONS)}`}
                title={tokenDoesNotExist ? t('trending.tokenSale.createTokenToUnlock') : undefined}
              >
                <span className="flex items-center justify-center gap-1.5">
                  {tokenDoesNotExist && <Lock className="h-3 w-3" />}
                  {t('trending.tokenSale.tabTransactions')}
                </span>
              </button>
              <button
                type="button"
                disabled={tokenDoesNotExist}
                onClick={() => !tokenDoesNotExist && setActiveTab(TAB_HOLDERS)}
                className={`flex-1 px-4 py-3 text-[10px] font-bold transition-colors ${mobileTabBtnClass(tokenDoesNotExist, activeTab === TAB_HOLDERS)}`}
                title={tokenDoesNotExist ? t('trending.tokenSale.createTokenToUnlock') : undefined}
              >
                <span className="flex items-center justify-center gap-1.5">
                  {tokenDoesNotExist && <Lock className="h-3 w-3" />}
                  {t('trending.tokenSale.tabHolders')}
                  {!tokenDoesNotExist && ` (${token?.holders_count || 0})`}
                </span>
              </button>
            </div>
          )}

          {/* Tab Content */}
          <div className={`p-0 md:p-1 ${isMobile ? 'mb-24 pb-4' : ''}`}>
            {isMobile && activeTab === TAB_DETAILS && (
              tokenDoesNotExist ? (
                <Card className="liquid-glass rounded-xl p-6">
                  <div className="text-center">
                    <div
                      className="w-20 h-20 mx-auto mb-4 rounded-xl flex items-center justify-center"
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
                      {t('trending.tokenSale.tokenNotCreatedYet')}
                    </h3>
                    <p className="text-white/60 text-sm mb-4">
                      {t('trending.tokenSale.tokenNotCreatedYetHint')}
                    </p>
                    <Button
                      variant="gradient"
                      size="lg"
                      onClick={() => {
                        const truncatedName = (tokenName || '').slice(0, 20);
                        navigate(`/trends/create?tokenName=${encodeURIComponent(truncatedName)}`);
                      }}
                      className="w-full px-6 py-5 text-sm font-bold transition-all duration-300 hover:scale-105"
                    >
                      {t('trending.tokenSale.createThisToken')}
                    </Button>
                  </div>
                </Card>
              ) : (
                <TokenInfoTab token={token} />
              )
            )}

            {isMobile && activeTab === TAB_TRADE && (
              tokenDoesNotExist ? (
                <Card className="liquid-glass rounded-xl p-6">
                  <div className="text-center">
                    <Lock className="w-16 h-16 mx-auto mb-4 text-white/20" />
                    <h3 className="text-lg font-bold text-white mb-2">
                      {t('trending.tokenSale.tradingNotAvailable')}
                    </h3>
                    <p className="text-white/60 text-sm mb-4">
                      {t('trending.tokenSale.tradingNotAvailableHint')}
                    </p>
                  </div>
                </Card>
              ) : (
                <TokenTradeTab
                  token={token}
                  isLoading={isLoading}
                  isTokenPending={isTokenPending}
                  onBuy={() => openTradeFor(true)}
                  onSell={() => openTradeFor(false)}
                />
              )
            )}

            {activeTab === TAB_CHAT && (
              <TokenFeedTab
                token={{
                  ...(token || {}),
                  symbol: tokenName,
                  name: tokenName,
                } as TokenDto}
                isMobile={isMobile}
                showComposer={showComposer}
                holdersOnly={holdersOnly}
                setHoldersOnly={setHoldersOnly}
                showTradePanels={showTradePanels}
                setShowTradePanels={setShowTradePanels}
              />
            )}

            {activeTab === TAB_TRANSACTIONS && (
              tokenDoesNotExist ? (
                <Card className="liquid-glass rounded-xl p-6">
                  <div className="text-center">
                    <Lock className="w-16 h-16 mx-auto mb-4 text-white/20" />
                    <h3 className="text-lg font-bold text-white mb-2">
                      {t('trending.tokenSale.noTransactionsYet')}
                    </h3>
                    <p className="text-white/60 text-sm mb-4">
                      {t('trending.tokenSale.noTransactionsYetHint')}
                    </p>
                  </div>
                </Card>
              ) : (
                <TokenTransactionsTab token={token} />
              )
            )}

            {activeTab === TAB_HOLDERS && (
              tokenDoesNotExist ? (
                <Card className="liquid-glass rounded-xl p-6">
                  <div className="text-center">
                    <Lock className="w-16 h-16 mx-auto mb-4 text-white/20" />
                    <h3 className="text-lg font-bold text-white mb-2">
                      {t('trending.tokenSale.noHoldersYet')}
                    </h3>
                    <p className="text-white/60 text-sm mb-4">
                      {t('trending.tokenSale.noHoldersYetHint')}
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
            {(() => {
              if (tokenDoesNotExist) {
                return (
                  <Card className="liquid-glass rounded-xl p-6">
                    <div className="text-center">
                      <div
                        className="w-20 h-20 mx-auto mb-4 rounded-xl flex items-center justify-center"
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
                        {t('trending.tokenSale.createToken')}
                      </h3>
                      <p className="text-white/60 text-sm mb-4">
                        {t('trending.tokenSale.createTokenSidebarHint')}
                      </p>
                      <Button
                        variant="gradient"
                        size="lg"
                        onClick={() => {
                          const truncatedName = (tokenName || '').slice(0, 20);
                          navigate(`/trends/create?tokenName=${encodeURIComponent(truncatedName)}`);
                        }}
                        className="w-full px-6 py-5 text-sm font-bold transition-all duration-300 hover:scale-105"
                      >
                        Create This Token
                      </Button>
                    </div>
                  </Card>
                );
              }
              if (!token?.sale_address) return <TokenSaleSidebarSkeleton />;
              return (
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
              );
            })()}
          </div>
        )}
      </div>

      {/* Mobile Trading Modal */}
      {(showTradePanels && tradeActionSheet && token?.sale_address) && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end"
          onClick={closeTradeActionSheet}
          role="presentation"
          style={{
            paddingBottom: 'var(--mobile-footer-actual-height, calc(var(--mobile-footer-height) + env(safe-area-inset-bottom) + 12px))',
          }}
        >
          <div
            className="w-full max-h-[85vh] overflow-y-auto supports-not-[backdrop-filter]:bg-black/70 [backdrop-filter:blur(8px)] [-webkit-backdrop-filter:blur(8px)]"
            onClick={(event) => event.stopPropagation()}
            role="presentation"
          >
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
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-btn bg-gradient-brand-135 text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 active:scale-95"
          aria-label={t('trending.tokenSale.addNewPost')}
          title={t('trending.tokenSale.addNewPost')}
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-semibold whitespace-nowrap">
            {t('trending.tokenSale.addNewPost')}
          </span>
        </button>
      )}

      {/* Token Creation Banner */}
      {showCreatedOverlay && (
        <TokenCreationBanner
          txHash={txHash}
          txConfirmed={txConfirmed}
          tokenName={tokenName}
          hasSaleAddress={!!token?.sale_address}
          onDismiss={() => setShowCreatedOverlay(false)}
        />
      )}
    </div>
  );
};

export default TokenSaleDetails;
