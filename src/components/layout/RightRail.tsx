import { useMemo } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useAccountBalances } from "../../hooks/useAccountBalances";
import WalletOverviewCard from "@/components/wallet/WalletOverviewCard";
import { useAeSdk } from "../../hooks/useAeSdk";
import { BuyAeWidget } from "../../features/ae-eth-buy";

import { useWallet } from "../../hooks";
import { useAddressByChainName } from "../../hooks/useChainName";
import { useCurrencies } from "@/hooks/useCurrencies";

export default function RightRail({
  hidePriceSection = true,
}: {
  hidePriceSection?: boolean;
}) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const { activeAccount } = useAeSdk();
  const { currentCurrencyCode, setCurrentCurrency, currencyRates } = useCurrencies();
  
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
  const selectedCurrency = (currentCurrencyCode as any) as "usd" | "eur" | "cny";
  const prices = useMemo(() => {
    return {
      usd: (currencyRates as any)?.usd ?? null,
      eur: (currencyRates as any)?.eur ?? null,
      cny: (currencyRates as any)?.cny ?? null,
    };
  }, [currencyRates]);

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

  return (
    <div id="right-rail-root" className="grid gap-4 h-fit min-w-0 scrollbar-thin scrollbar-track-white/[0.02] scrollbar-thumb-gradient-to-r scrollbar-thumb-from-pink-500/60 scrollbar-thumb-via-[rgba(0,255,157,0.6)] scrollbar-thumb-to-pink-500/60 scrollbar-thumb-rounded-[10px] scrollbar-thumb-border scrollbar-thumb-border-white/10 hover:scrollbar-thumb-from-pink-500/80 hover:scrollbar-thumb-via-[rgba(0,255,157,0.8)] hover:scrollbar-thumb-to-pink-500/80">
      {/* Network & Wallet Overview - Hidden on own profile */}
      {!isOwnProfile && (
        <div className="bg-white/[0.03] border border-white/10 rounded-[20px] px-5 py-4 shadow-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative overflow-hidden">
          <WalletOverviewCard key={activeAccount} selectedCurrency={selectedCurrency} prices={prices} />
        </div>
      )}

      {/* Enhanced Price Section (hidden by default via hidePriceSection) */}
      {!hidePriceSection && (
        <div className="bg-white/[0.03] border border-white/10 rounded-[20px] p-4 shadow-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative overflow-hidden">
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
                  onClick={() => setCurrentCurrency(currency as any)}
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
                  {/* 24h stats removed: market-data endpoint is not available right now */}
                </div>
              </div>
              <div className="flex-shrink-0">
                {/* Sparkline removed: AE price is now globally polled via AePricePollingProvider */}
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-b-0">
                <span className="text-[11px] text-[var(--light-font-color)] uppercase tracking-wide">
                  Market Cap
                </span>
                <span className="text-[11px] text-[var(--standard-font-color)] font-semibold">
                  -
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-b-0">
                <span className="text-[11px] text-[var(--light-font-color)] uppercase tracking-wide">
                  24h Volume
                </span>
                <span className="text-[11px] text-[var(--standard-font-color)] font-semibold">
                  -
                </span>
              </div>
            </div>
          </div>
        </div>
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

      {/* Buy AE with ETH widget (compact) */}
      <div className="bg-white/[0.03] border border-white/10 rounded-[20px] p-4 shadow-none">
        <BuyAeWidget embedded={true} />
      </div>


      {/* Trading Leaderboard promo */}
      <div className="bg-white/[0.03] border border-white/10 rounded-[20px] p-4 shadow-none mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🏆</span>
          <h4 className="m-0 text-white text-base font-bold">
            Top Traders
          </h4>
        </div>
        <p className="text-[11px] text-[var(--light-font-color)] mb-3">
          See which wallets are leading the markets by PnL, ROI and AUM on the Trading Leaderboard.
        </p>
        <button
          className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-black border-none rounded-xl py-2.5 px-3 text-xs font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
          onClick={() => navigate('/trends/leaderboard')}
        >
          View Trading Leaderboard
        </button>
      </div>

      {/* Quick Actions - moved to Right Rail bottom */}
      <div className="bg-white/[0.03] border border-white/10 rounded-[20px] p-4 shadow-none transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] relative overflow-hidden">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">⚡</span>
          <h4 className="m-0 text-white text-base font-bold">
            Quick Actions
          </h4>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            className="bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white border-none rounded-xl py-3.5 px-3.5 text-xs font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden after:content-[''] after:absolute after:top-0 after:-left-full after:w-full after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:transition-all after:duration-600 hover:after:left-full"
            onClick={() => navigate('/trends/tokens')}
            title={t('titles.exploreTrends')}
          >
            🔍 Explore Trends
          </button>
          <button
            className="bg-gradient-to-r from-rose-500 to-orange-500 text-white border-none rounded-xl py-3.5 px-3.5 text-xs font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden after:content-[''] after:absolute after:top-0 after:-left-full after:w-full after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:transition-all after:duration-600 hover:after:left-full"
            onClick={() => navigate('/trends/create')}
            title={t('titles.tokenizeATrend')}
          >
            🚀 Tokenize a Trend
          </button>
          <button
            className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-none rounded-xl py-3.5 px-3.5 text-xs font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden after:content-[''] after:absolute after:top-0 after:-left-full after:w-full after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:transition-all after:duration-600 hover:after:left-full"
            onClick={() => navigate('/defi/swap')}
            title={t('titles.swapTokensOnDex')}
          >
            🔄 Swap Tokens
          </button>
          <button
            className="bg-gradient-to-r from-sky-500 to-blue-600 text-white border-none rounded-xl py-3.5 px-3.5 text-xs font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden after:content-[''] after:absolute after:top-0 after:-left-full after:w-full after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:transition-all after:duration-600 hover:after:left-full"
            onClick={() => navigate('/defi/wrap')}
            title={t('titles.wrapOrUnwrapAe')}
          >
            📦 Wrap AE
          </button>
          <button
            className="bg-gradient-to-r from-indigo-500 to-blue-600 text-white border-none rounded-xl py-3.5 px-3.5 text-xs font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden after:content-[''] after:absolute after:top-0 after:-left-full after:w-full after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:transition-all after:duration-600 hover:after:left-full"
            onClick={() => navigate('/defi/buy-ae-with-eth')}
            title={t('titles.buyAeWithEth')}
          >
            🌉 Buy AE with ETH
          </button>
          <button
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white border-none rounded-xl py-3.5 px-3.5 text-xs font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative overflow-hidden after:content-[''] after:absolute after:top-0 after:-left-full after:w-full after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:transition-all after:duration-600 hover:after:left-full"
            onClick={() => navigate('/defi/pool')}
            title={t('titles.provideLiquidityToPools')}
          >
            💧 Provide Liquidity
          </button>
          <a
            href="https://quali.chat"
            target="_blank"
            rel="noopener noreferrer"
            className="col-span-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white border-none rounded-xl py-3.5 px-3.5 text-xs font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(147,51,234,0.35)] no-underline text-center flex items-center justify-center gap-1.5 relative overflow-hidden after:content-[''] after:absolute after:top-0 after:-left-full after:w-full after:h-full after:bg-gradient-to-r after:from-transparent after:via-white/30 after:to-transparent after:transition-all after:duration-600 hover:after:left-full"
            title={t('titles.openChat')}
          >
            💬 Chat
          </a>
        </div>
      </div>
    </div>
  );
}
