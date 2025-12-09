import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, useParams, Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { SuperheroApi } from "../../api/backend";
import { useAccountBalances } from "../../hooks/useAccountBalances";
import WalletOverviewCard from "@/components/wallet/WalletOverviewCard";
import { useAeSdk } from "../../hooks/useAeSdk";
import Sparkline from "../Trendminer/Sparkline";
import { HeaderLogo, IconWallet } from "../../icons";
import { getNavigationItems } from "./app-header/navigationItems";

import { useWallet, useWalletConnect } from "../../hooks";
import { useAddressByChainName } from "../../hooks/useChainName";
import LayoutSwitcher from "./LayoutSwitcher";
import TabSwitcher from "./TabSwitcher";
import { GlassSurface } from "../ui/GlassSurface";
import AeButton from "../AeButton";

export default function LeftRail({
  hidePriceSection = true,
}: {
  hidePriceSection?: boolean;
}) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { activeAccount } = useAeSdk();
  const { connectWallet } = useWalletConnect();
  
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

  // Load data
  useEffect(() => {
    async function loadPrice() {
      try {
        // Step 1: First, try to load today's daily price from historical data (fast, cached on backend)
        // This gives us immediate price data without waiting for CoinGecko
        // Only fetch the selected currency first for instant display
        try {
          const historicalData = await SuperheroApi.getHistoricalPrice(selectedCurrency, 1, 'daily');
          if (historicalData && Array.isArray(historicalData) && historicalData.length > 0) {
            // Get the latest price point (last item in array)
            const latestPrice = historicalData[historicalData.length - 1];
            if (Array.isArray(latestPrice) && latestPrice.length >= 2) {
              const price = latestPrice[1];
              
              // Update prices immediately with quick data for selected currency
              setPrices((prevPrices) => {
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
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.warn("Failed to load quick historical price:", error);
          }
        }

        // Step 2: Fetch current currency rates and market data asynchronously (may hit CoinGecko)
        // This updates with the latest data in the background
        const [ratesResult, marketDataResult] = await Promise.allSettled([
          SuperheroApi.getCurrencyRates(),
          SuperheroApi.getMarketData(selectedCurrency),
        ]);

        const rates = ratesResult.status === 'fulfilled' ? ratesResult.value : null;
        const marketData = marketDataResult.status === 'fulfilled' ? marketDataResult.value : null;

        // Log errors for failed requests
        if (ratesResult.status === 'rejected') {
          console.error("Failed to load currency rates:", ratesResult.reason);
        } else if (ratesResult.status === 'fulfilled' && rates === null) {
          if (process.env.NODE_ENV === 'development') {
            console.warn("Currency rates API returned empty response");
          }
        }
        
        if (marketDataResult.status === 'rejected') {
          console.error("Failed to load market data:", marketDataResult.reason);
        } else if (marketDataResult.status === 'fulfilled' && marketData === null) {
          if (process.env.NODE_ENV === 'development') {
            console.warn("Market data API returned empty response");
          }
        }

        // Update sparklines whenever rates are available (regardless of marketData)
        if (rates) {
          if (rates.usd != null) {
            setUsdSpark((prev) => {
              const next = [...prev, Number(rates.usd)].slice(-50);
              sessionStorage.setItem("ae_spark_usd", JSON.stringify(next));
              return next;
            });
          }

          if (rates.eur != null) {
            setEurSpark((prev) => {
              const next = [...prev, Number(rates.eur)].slice(-50);
              sessionStorage.setItem("ae_spark_eur", JSON.stringify(next));
              return next;
            });
          }
        }

        // Update price data, preserving existing market stats when marketData fails
        // Use API rates if available, otherwise fallback to latest sparkline value
        setPrices((prevPrices) => {
          const priceData: any = {
            usd: rates?.usd ?? null,
            eur: rates?.eur ?? null,
            cny: rates?.cny ?? null,
          };

          // Fallback to sparkline data if API rates are null but we have sparkline data
          // Read from sessionStorage to get the most current values
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

          // Only update market stats if marketData is available
          // Otherwise preserve existing values to prevent overwriting with null
          if (marketData) {
            priceData.change24h = marketData.priceChangePercentage24h || 
                                  marketData.price_change_percentage_24h || 
                                  null;
            priceData.marketCap = marketData.marketCap || 
                                 marketData.market_cap || 
                                 null;
            priceData.volume24h = marketData.totalVolume || 
                                 marketData.total_volume || 
                                 null;
          } else {
            // Preserve existing market stats when marketData fails
            priceData.change24h = prevPrices?.change24h ?? null;
            priceData.marketCap = prevPrices?.marketCap ?? null;
            priceData.volume24h = prevPrices?.volume24h ?? null;
          }

          // Only update if we have at least one currency price
          if (priceData.usd != null || priceData.eur != null || priceData.cny != null) {
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

          // Return previous prices if no new data available
          return prevPrices;
        });
      } catch (error) {
        console.error("Failed to load price data:", error);
        // On error, try to use cached data or sparkline fallback
        setPrices((prevPrices) => {
          if (prevPrices) return prevPrices;
          
          // Fallback to sparkline data if available
          const fallbackData: any = {};
          try {
            const usdSparkData = sessionStorage.getItem("ae_spark_usd");
            if (usdSparkData) {
              const usdSparkArray = JSON.parse(usdSparkData);
              if (Array.isArray(usdSparkArray) && usdSparkArray.length > 0) {
                fallbackData.usd = usdSparkArray[usdSparkArray.length - 1];
              }
            }
          } catch {
            // Ignore errors
          }
          
          try {
            const eurSparkData = sessionStorage.getItem("ae_spark_eur");
            if (eurSparkData) {
              const eurSparkArray = JSON.parse(eurSparkData);
              if (Array.isArray(eurSparkArray) && eurSparkArray.length > 0) {
                fallbackData.eur = eurSparkArray[eurSparkArray.length - 1];
              }
            }
          } catch {
            // Ignore errors
          }
          
          if (fallbackData.usd != null || fallbackData.eur != null) {
            return fallbackData;
          }
          
          return null;
        });
      }
    }

    loadPrice();
    const t = window.setInterval(loadPrice, 30000);
    return () => {
      window.clearInterval(t);
    };
  }, [selectedCurrency]);

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
            
            <AeButton
              variant="primary"
              onClick={connectWallet}
              className="w-full py-3 font-bold text-base shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-300"
            >
              Connect Now
            </AeButton>
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
            onClick={() => navigate('/defi/swap')}
            title={t('titles.swapTokensOnDex')}
          >
            🔄 Swap Tokens
          </button>
          <button
            className="bg-gradient-to-r from-sky-500 to-blue-600 text-white border-none rounded-xl py-3 px-2 text-[10px] font-bold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden shadow-md"
            onClick={() => navigate('/defi/wrap')}
            title={t('titles.wrapOrUnwrapAe')}
          >
            📦 Wrap AE
          </button>
          <button
            className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white border-none rounded-xl py-3 px-2 text-[10px] font-bold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden shadow-md"
            onClick={() => navigate('/defi/buy-ae-with-eth')}
            title={t('titles.buyAeWithEth')}
          >
            🌉 Buy AE w/ ETH
          </button>
          <button
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-none rounded-xl py-3 px-2 text-[10px] font-bold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden shadow-md"
            onClick={() => navigate('/defi/pool')}
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

    </div>
  );
}
