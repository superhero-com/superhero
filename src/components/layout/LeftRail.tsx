import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, useParams, Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { SuperheroApi } from "../../api/backend";
import { useAccountBalances } from "../../hooks/useAccountBalances";
import WalletOverviewCard from "@/components/wallet/WalletOverviewCard";
import { useAeSdk } from "../../hooks/useAeSdk";
import Sparkline from "../Trendminer/Sparkline";
import { HeaderLogo, IconWallet } from "../../icons";
import Favicon from "../../svg/favicon.svg?react";
import { getNavigationItems } from "./app-header/navigationItems";

import { useWallet, useWalletConnect, useModal } from "../../hooks";
import { useAddressByChainName } from "../../hooks/useChainName";
import { useCurrencies } from "../../hooks/useCurrencies";
import LayoutSwitcher from "./LayoutSwitcher";
import TabSwitcher from "./TabSwitcher";
import { GlassSurface } from "../ui/GlassSurface";
import AeButton from "../AeButton";
import { ConnectWalletButton } from "../ConnectWalletButton";
import FooterSection from "./FooterSection";

export default function LeftRail({
  hidePriceSection = true,
}: {
  hidePriceSection?: boolean;
}) {
  const { t } = useTranslation('common');
  const { openModal } = useModal();
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { activeAccount } = useAeSdk();
  const { connectWallet } = useWalletConnect();
  const { currencyRates, aeternityData } = useCurrencies();
  
  // Resolve chain name if present
  const isChainName = params.address?.endsWith(".chain");
  const { address: resolvedAddress } = useAddressByChainName(
    isChainName ? params.address : undefined
  );
  const effectiveProfileAddress = isChainName && resolvedAddress 
    ? resolvedAddress 
    : (params.address as string | undefined);
  
  // Check if we're on the user's own profile page
  const isOwnProfile = useMemo(() => {
    const isProfilePage = location.pathname.startsWith('/users/');
    if (!isProfilePage) return false;
    if (!activeAccount || !effectiveProfileAddress) return false;
    return effectiveProfileAddress === activeAccount;
  }, [location.pathname, effectiveProfileAddress, activeAccount]);
  
  const [prices, setPrices] = useState<any>(() => {
    // Initialize from cache if available
    try {
      const cached = sessionStorage.getItem("ae_prices");
      if (cached) {
        const parsed = JSON.parse(cached);
        // Check if cache is recent (less than 5 minutes old)
        if (parsed.timestamp && Date.now() - parsed.timestamp < 5 * 60 * 1000) {
          return parsed.data;
        }
      }
    } catch {
      // Ignore cache errors
    }
    return null;
  });
  const [selectedCurrency, setSelectedCurrency] = useState<
    "usd" | "eur" | "cny"
  >("usd");
  
  // Use React Query for historical price to avoid duplicate requests
  const { data: historicalPriceData } = useQuery({
    queryKey: ['historical-price', selectedCurrency],
    queryFn: () => SuperheroApi.getHistoricalPrice(selectedCurrency, 1, 'daily'),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // 30 seconds (matching the old interval)
  });

  const [usdSpark, setUsdSpark] = useState<number[]>(() => {
    try {
      const raw = sessionStorage.getItem("ae_spark_usd");
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.slice(-50) : [];
    } catch {
      return [];
    }
  });

  const [eurSpark, setEurSpark] = useState<number[]>(() => {
    try {
      const raw = sessionStorage.getItem("ae_spark_eur");
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.slice(-50) : [];
    } catch {
      return [];
    }
  });

  const address = useWallet().address;
  const accountId = useMemo(
    () => activeAccount || address || "",
    [activeAccount, address]
  );
  useAccountBalances(accountId);

  // Note: loadAccountData() is automatically called by useAccountBalances hook
  // when accountId changes, so no manual call is needed here

  const formatPrice = (price: number, currency: string) => {
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
    return formatter.format(price);
  };

  const formatMarketCap = (amount: number): string => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`;
    }
    return `$${amount.toFixed(0)}`;
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return "var(--neon-green)";
    if (change < 0) return "var(--neon-pink)";
    return "#94a3b8";
  };

  // Update prices when currency rates, market data, or historical price data changes
  // This uses data from useCurrencies hook (React Query cached) instead of making duplicate API calls
  useEffect(() => {
    // Step 1: Use historical price data from React Query (cached)
    if (historicalPriceData && Array.isArray(historicalPriceData) && historicalPriceData.length > 0) {
      const latestPrice = historicalPriceData[historicalPriceData.length - 1];
      if (Array.isArray(latestPrice) && latestPrice.length >= 2) {
        const price = latestPrice[1];
        setPrices((prevPrices) => {
          // Only update if the price actually changed
          if (prevPrices?.[selectedCurrency] === price) {
            return prevPrices;
          }
          
          const quickPriceData: any = {
            usd: prevPrices?.usd ?? null,
            eur: prevPrices?.eur ?? null,
            cny: prevPrices?.cny ?? null,
            [selectedCurrency]: price,
          };
          
          // Preserve existing market stats
          quickPriceData.change24h = prevPrices?.change24h ?? null;
          quickPriceData.marketCap = prevPrices?.marketCap ?? null;
          quickPriceData.volume24h = prevPrices?.volume24h ?? null;
          
          return quickPriceData;
        });
      }
    }

    // Step 2: Use currency rates and market data from useCurrencies hook (React Query cached)
    // Update sparklines whenever rates are available (only if they changed)
    if (currencyRates) {
      if (currencyRates.usd != null) {
        setUsdSpark((prev) => {
          const newValue = Number(currencyRates.usd);
          // Only update if the value actually changed
          if (prev.length > 0 && prev[prev.length - 1] === newValue) {
            return prev;
          }
          const next = [...prev, newValue].slice(-50);
          sessionStorage.setItem("ae_spark_usd", JSON.stringify(next));
          return next;
        });
      }

      if (currencyRates.eur != null) {
        setEurSpark((prev) => {
          const newValue = Number(currencyRates.eur);
          // Only update if the value actually changed
          if (prev.length > 0 && prev[prev.length - 1] === newValue) {
            return prev;
          }
          const next = [...prev, newValue].slice(-50);
          sessionStorage.setItem("ae_spark_eur", JSON.stringify(next));
          return next;
        });
      }
    }

    // Update price data using currency rates and market data from useCurrencies hook
    setPrices((prevPrices) => {
      const priceData: any = {
        usd: currencyRates?.usd ?? null,
        eur: currencyRates?.eur ?? null,
        cny: currencyRates?.cny ?? null,
      };

      // Fallback to sparkline data if API rates are null but we have sparkline data
      if (!priceData.usd) {
        try {
          const usdSparkData = sessionStorage.getItem("ae_spark_usd");
          if (usdSparkData) {
            const usdSparkArray = JSON.parse(usdSparkData);
            if (Array.isArray(usdSparkArray) && usdSparkArray.length > 0) {
              priceData.usd = usdSparkArray[usdSparkArray.length - 1];
            }
          }
        } catch {
          // Ignore errors reading sparkline data
        }
      }
      
      if (!priceData.eur) {
        try {
          const eurSparkData = sessionStorage.getItem("ae_spark_eur");
          if (eurSparkData) {
            const eurSparkArray = JSON.parse(eurSparkData);
            if (Array.isArray(eurSparkArray) && eurSparkArray.length > 0) {
              priceData.eur = eurSparkArray[eurSparkArray.length - 1];
            }
          }
        } catch {
          // Ignore errors reading sparkline data
        }
      }

      // Update market stats from aeternityData (from useCurrencies hook)
      if (aeternityData) {
        priceData.change24h = aeternityData.priceChangePercentage24h || 
                              aeternityData.price_change_percentage_24h || 
                              null;
        priceData.marketCap = aeternityData.marketCap || 
                             aeternityData.market_cap || 
                             null;
        priceData.volume24h = aeternityData.totalVolume || 
                             aeternityData.total_volume || 
                             null;
      } else {
        // Preserve existing market stats when marketData is not available
        priceData.change24h = prevPrices?.change24h ?? null;
        priceData.marketCap = prevPrices?.marketCap ?? null;
        priceData.volume24h = prevPrices?.volume24h ?? null;
      }

      // Check if data actually changed before updating
      const hasChanged = 
        prevPrices?.usd !== priceData.usd ||
        prevPrices?.eur !== priceData.eur ||
        prevPrices?.cny !== priceData.cny ||
        prevPrices?.change24h !== priceData.change24h ||
        prevPrices?.marketCap !== priceData.marketCap ||
        prevPrices?.volume24h !== priceData.volume24h;

      // Only update if we have at least one currency price AND data changed
      if ((priceData.usd != null || priceData.eur != null || priceData.cny != null) && hasChanged) {
        // Cache the price data
        try {
          sessionStorage.setItem("ae_prices", JSON.stringify({
            data: priceData,
            timestamp: Date.now(),
          }));
        } catch {
          // Ignore cache errors
        }
        return priceData;
      }

      // Return previous prices if no new data available or nothing changed
      return prevPrices;
    });
  }, [selectedCurrency, currencyRates, aeternityData, historicalPriceData]);

  const { t: tNav } = useTranslation('navigation');
  const navigationItems = getNavigationItems(tNav);
  const isDaoPath = location.pathname.startsWith('/trends/dao') || location.pathname.startsWith('/trends/daos');
  
  const isActiveRoute = (path: string) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/trends/daos') return isDaoPath;
    return location.pathname.startsWith(path);
  };

  return (
    <div id="left-rail-root" className="grid gap-6 h-fit min-w-0 scrollbar-thin scrollbar-track-white/[0.02] scrollbar-thumb-gradient-to-r scrollbar-thumb-from-pink-500/60 scrollbar-thumb-via-[rgba(0,255,157,0.6)] scrollbar-thumb-to-pink-500/60 scrollbar-thumb-rounded-[10px] scrollbar-thumb-border scrollbar-thumb-border-white/10 hover:scrollbar-thumb-from-pink-500/80 hover:scrollbar-thumb-via-[rgba(0,255,157,0.8)] hover:scrollbar-thumb-to-pink-500/80">
      {/* LayoutSwitcher hidden */}
      {/* Navigation Bar - Tab style like LayoutSwitcher */}
      <div className="mb-0">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="flex items-center no-underline hover:no-underline group" aria-label="Superhero Home">
            <HeaderLogo className="h-8 w-auto transition-transform duration-200 group-hover:scale-105" />
          </Link>
        </div>
        <TabSwitcher
          items={navigationItems
            .filter((item: any) => !!item && !!item.id && !item.isExternal)
            .map((item: any) => ({
              id: item.id,
              label: item.label,
              path: item.path,
              icon: item.icon,
            }))}
        />
      </div>
      
      {/* Connect Wallet Card - Only show if not connected */}
      {!activeAccount && (
        <GlassSurface className="p-4 text-center group" interactive>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative z-10">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 transform group-hover:scale-110 transition-transform duration-300">
              <IconWallet className="w-8 h-8 text-white" />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2">
              Connect Wallet
            </h3>
            
            <p className="text-sm text-white/60 mb-6 leading-relaxed">
              Access your assets and start trading on Superhero.
            </p>
            
            <div className="connect-wallet-button-wrapper">
              <style>{`
                .connect-wallet-button-wrapper svg path {
                  fill: white !important;
                }
                .connect-wallet-button-wrapper span svg path {
                  fill: white !important;
                }
                .connect-wallet-button-wrapper button svg path {
                  fill: white !important;
                }
                .connect-wallet-button-wrapper button span svg path {
                  fill: white !important;
                }
              `}</style>
              <ConnectWalletButton
                block
                variant="dex"
                className="!w-full !rounded-xl !py-3 !font-bold !text-base !shadow-lg !shadow-blue-500/20 hover:!shadow-blue-500/40 hover:!-translate-y-0.5 !transition-all !duration-300 !bg-[#1161FE] !text-white [&_svg_path]:!fill-white [&_span_svg_path]:!fill-white"
              />
            </div>
          </div>
        </GlassSurface>
      )}
      
      {/* Network & Wallet Overview - Hidden on own profile */}
      {!isOwnProfile && (
        <GlassSurface className="p-4" interactive>
          <WalletOverviewCard key={activeAccount} selectedCurrency={selectedCurrency} prices={prices} />
        </GlassSurface>
      )}

      {/* Enhanced Price Section (hidden by default via hidePriceSection) */}
      {!hidePriceSection && (
        <GlassSurface className="p-4" interactive>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
              📈
            </span>
            <h4 className="m-0 text-base font-bold text-[var(--standard-font-color)] flex-1">
              AE Price
            </h4>
            <div className="flex gap-1">
              {(["usd", "eur", "cny"] as const).map((currency) => (
                <button
                  key={currency}
                  className={`bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[10px] cursor-pointer transition-all duration-200 hover:bg-white/10 ${
                    selectedCurrency === currency
                      ? "bg-[var(--neon-teal)] text-white border-[var(--neon-teal)]"
                      : "text-[var(--light-font-color)]"
                  }`}
                  onClick={() => setSelectedCurrency(currency)}
                >
                  {currency.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <div className="text-xl font-bold text-[var(--standard-font-color)] mb-1">
                  {prices?.[selectedCurrency]
                    ? formatPrice(prices[selectedCurrency], selectedCurrency)
                    : "-"}
                </div>
                <div className="text-xs font-semibold">
                  {prices?.change24h && (
                    <span
                      style={{ color: getPriceChangeColor(prices.change24h) }}
                    >
                      {prices.change24h > 0 ? "+" : ""}
                      {prices.change24h.toFixed(2)}% (24h)
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0">
                <Sparkline
                  points={selectedCurrency === "usd" ? usdSpark : eurSpark}
                  width={80}
                  height={24}
                  stroke={selectedCurrency === "usd" ? "#66d19e" : "#5bb0ff"}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-b-0">
                <span className="text-[11px] text-[var(--light-font-color)] uppercase tracking-wide">
                  Market Cap
                </span>
                <span className="text-[11px] text-[var(--standard-font-color)] font-semibold">
                  {prices?.marketCap ? formatMarketCap(prices.marketCap) : "-"}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-b-0">
                <span className="text-[11px] text-[var(--light-font-color)] uppercase tracking-wide">
                  24h Volume
                </span>
                <span className="text-[11px] text-[var(--standard-font-color)] font-semibold">
                  {prices?.volume24h ? formatMarketCap(prices.volume24h) : "-"}
                </span>
              </div>
            </div>
          </div>
        </GlassSurface>
      )}

      {/* Enhanced Trending Section */}
      {/* <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-[20px] rounded-[20px] p-5 shadow-[var(--glass-shadow)] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative overflow-hidden hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4),0_12px_32px_rgba(255,107,107,0.2)] before:content-[''] before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-[var(--border-gradient)] before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">🔥</span>
          <h4 className="m-0 text-base font-bold text-[var(--standard-font-color)] flex-1">Trending Topics</h4>
          <button
            className="bg-none border-none text-[var(--neon-teal)] text-base cursor-pointer p-1 rounded transition-all duration-200 hover:bg-[rgba(0,255,157,0.1)] hover:scale-110"
            onClick={() => window.location.href = '/trends'}
            title={t('titles.exploreAllTrends')}
          >
            🔍
          </button>
        </div>

        <div className="grid gap-2">
          {topTrending.map((topic, index) => (
            <div key={index} className="flex items-center gap-2 p-2 px-3 bg-white/[0.02] border border-white/5 rounded-lg transition-all duration-200 cursor-pointer hover:bg-white/5 hover:border-white/10 hover:translate-x-1">
              <span className="text-[10px] text-[var(--neon-pink)] font-bold min-w-[20px]">#{index + 1}</span>
              <span className="flex-1 text-xs text-[var(--standard-font-color)] font-semibold">
                {typeof topic[0] === 'string' ? topic[0] : 'Unknown Topic'}
              </span>
              <span className="text-[10px] text-[var(--light-font-color)]">
                {typeof topic[1] === 'number' ? `${topic[1]} mentions` : '0 mentions'}
              </span>
            </div>
          ))}
        </div>
      </div> */}


      {/* Trading Leaderboard promo */}
      <GlassSurface className="p-4 mb-0" interactive>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-base">🏆</span>
          <h4 className="m-0 text-white text-sm font-bold">
            Top Traders
          </h4>
        </div>
        <p className="text-[11px] text-[var(--light-font-color)] mb-3 leading-relaxed">
          See which wallets are leading the markets by PnL, ROI and AUM on the Trading Leaderboard.
        </p>
        <button
          className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-black border-none rounded-xl py-2.5 px-3 text-[11px] font-bold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-md hover:shadow-yellow-500/20"
          onClick={() => navigate('/trends/leaderboard')}
        >
          View Trading Leaderboard
        </button>
      </GlassSurface>

      {/* Quick Actions - moved to Right Rail bottom */}
      <GlassSurface className="p-4" interactive>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-base">⚡</span>
          <h4 className="m-0 text-white text-sm font-bold">
            Quick Actions
          </h4>
      </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            className="bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white border-none rounded-xl py-3 px-2 text-[10px] font-bold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden shadow-md"
            onClick={() => navigate('/trends/tokens')}
            title={t('titles.exploreTrends')}
          >
            🔍 Explore Trends
          </button>
          <button
            className="bg-gradient-to-r from-rose-500 to-orange-500 text-white border-none rounded-xl py-3 px-2 text-[10px] font-bold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden shadow-md"
            onClick={() => navigate('/trends/create')}
            title={t('titles.tokenizeATrend')}
          >
            🚀 Tokenize Trend
          </button>
          <button
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-none rounded-xl py-3 px-2 text-[10px] font-bold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden shadow-md"
            onClick={() => navigate('/apps/swap')}
            title={t('titles.swapTokensOnDex')}
          >
            🔄 Swap Tokens
          </button>
          <button
            className="bg-gradient-to-r from-sky-500 to-blue-600 text-white border-none rounded-xl py-3 px-2 text-[10px] font-bold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden shadow-md"
            onClick={() => navigate('/apps/wrap')}
            title={t('titles.wrapOrUnwrapAe')}
          >
            📦 Wrap AE
          </button>
          <button
            className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white border-none rounded-xl py-3 px-2 text-[10px] font-bold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden shadow-md"
            onClick={() => navigate('/apps/buy-ae-with-eth')}
            title={t('titles.buyAeWithEth')}
          >
            🌉 Buy AE w/ ETH
          </button>
          <button
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-none rounded-xl py-3 px-2 text-[10px] font-bold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden shadow-md"
            onClick={() => navigate('/apps/pool')}
            title={t('titles.provideLiquidityToPools')}
          >
            💧 Liquidity
          </button>
          <a
            href="https://quali.chat"
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white border-none rounded-xl py-3 px-2 text-[10px] font-bold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(147,51,234,0.35)] no-underline text-center flex items-center justify-center gap-1.5 relative overflow-hidden shadow-md"
            title={t('titles.openChat')}
          >
            💬 Open Chat
          </a>
      </div>
      </GlassSurface>

      {/* Footer Section */}
      <FooterSection compact />

    </div>
  );
}
