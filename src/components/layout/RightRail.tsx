import { useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import WalletOverviewCard from '@/components/wallet/WalletOverviewCard';
import FeedRailSearch from '@/components/layout/FeedRailSearch';
import QuickActionsCard from '@/components/layout/QuickActionsCard';
import GetAeButton from '@/components/layout/GetAeButton';
import TopTradersCard from '@/components/layout/TopTradersCard';
import RewardsOnboarding from '@/components/onboarding/RewardsOnboarding';
import { useCurrencies } from '@/hooks/useCurrencies';
import { useAccountBalances } from '../../hooks/useAccountBalances';
import { useAeSdk } from '../../hooks/useAeSdk';
// import { BuyAeWidget } from '../../features/ae-eth-buy';
import { useWallet } from '../../hooks';
import { useAddressByChainName } from '../../hooks/useChainName';

const RightRail = ({
  hidePriceSection = true,
}: {
  hidePriceSection?: boolean;
}) => {
  const { t } = useTranslation('common');
  const location = useLocation();
  const params = useParams();
  const isSocialHomeFeed = location.pathname === '/';
  /** Dedicated AE Price card: not on home feed (feed search uses its own panel). */
  const showAePricePanel = !hidePriceSection && !isSocialHomeFeed;
  const { activeAccount } = useAeSdk();
  const { currentCurrencyCode, setCurrentCurrency, currencyRates } = useCurrencies();

  // Resolve chain name if present
  const isChainName = params.address?.endsWith('.chain');
  const { address: resolvedAddress } = useAddressByChainName(
    isChainName ? params.address : undefined,
  );
  const effectiveProfileAddress = isChainName
    ? (resolvedAddress || undefined)
    : (params.address as string | undefined);

  // Check if we're on the user's own profile page
  const isOwnProfile = useMemo(() => {
    const isProfilePage = location.pathname.startsWith('/users/');
    if (!isProfilePage) return false;
    if (!activeAccount || !effectiveProfileAddress) return false;
    return effectiveProfileAddress === activeAccount;
  }, [location.pathname, effectiveProfileAddress, activeAccount]);
  const selectedCurrency = (currentCurrencyCode as any) as 'usd' | 'eur' | 'cny';
  const prices = useMemo(() => ({
    usd: (currencyRates as any)?.usd ?? null,
    eur: (currencyRates as any)?.eur ?? null,
    cny: (currencyRates as any)?.cny ?? null,
  }), [currencyRates]);

  const { address } = useWallet();
  const accountId = useMemo(
    () => activeAccount || address || '',
    [activeAccount, address],
  );
  useAccountBalances(accountId);

  // Note: loadAccountData() is automatically called by useAccountBalances hook
  // when accountId changes, so no manual call is needed here

  const formatPrice = (price: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
    return formatter.format(price);
  };

  const railClassName = [
    'grid gap-4 h-fit min-w-0 scrollbar-thin scrollbar-track-white/[0.02]',
    'scrollbar-thumb-gradient-to-r scrollbar-thumb-from-pink-500/60',
    'scrollbar-thumb-via-[rgba(0,255,157,0.6)] scrollbar-thumb-to-pink-500/60',
    'scrollbar-thumb-rounded-[10px] scrollbar-thumb-border scrollbar-thumb-border-white/10',
    'hover:scrollbar-thumb-from-pink-500/80',
    'hover:scrollbar-thumb-via-[rgba(0,255,157,0.8)]',
    'hover:scrollbar-thumb-to-pink-500/80',
  ].join(' ');
  const walletRailCardClassName = [
    'bg-white/[0.03] border border-white/10 rounded-[20px] py-4',
    'px-4',
    'shadow-none transition-all duration-300 ease-in-out',
    'relative overflow-hidden',
  ].join(' ');
  const feedSearchCardClassName = [
    'bg-white/[0.03] border border-white/10 rounded-[20px] p-3',
    'shadow-none transition-all duration-300 ease-in-out',
    'relative overflow-visible',
  ].join(' ');
  const priceCardClassName = [
    'bg-white/[0.03] border border-white/10 rounded-[20px] p-4',
    'shadow-none transition-all duration-300 ease-in-out',
    'relative overflow-hidden',
  ].join(' ');

  return (
    <div id="right-rail-root" className={railClassName}>
      {isSocialHomeFeed ? (
        <div className={feedSearchCardClassName}>
          <FeedRailSearch />
        </div>
      ) : null}

      {/* Onboarding nudge — placed below the search bar so users can continue account setup. */}
      <RewardsOnboarding variant="rail" />

      {/* Network & Wallet Overview - Hidden on own profile */}
      {!isOwnProfile && (
        <div className={activeAccount ? walletRailCardClassName : undefined}>
          <WalletOverviewCard
            key={activeAccount}
            selectedCurrency={selectedCurrency}
            prices={prices}
          />
        </div>
      )}

      {/* Enhanced Price Section (via hidePriceSection;
      omitted on home — feed search is its own panel) */}
      {showAePricePanel && (
        <div className={priceCardClassName}>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]">
              📈
            </span>
            <h4 className="m-0 text-base font-bold text-[var(--standard-font-color)] flex-1">
              {t('rightRail.aePrice')}
            </h4>
            <div className="flex gap-1">
              {(['usd', 'eur', 'cny'] as const).map((currency) => (
                <button
                  type="button"
                  key={currency}
                  className={`bg-white/5 border border-white/10 rounded-md px-2 py-1 text-[10px] cursor-pointer transition-all duration-200 hover:bg-white/10 ${
                    selectedCurrency === currency
                      ? 'bg-[var(--neon-teal)] text-white border-[var(--neon-teal)]'
                      : 'text-[var(--light-font-color)]'
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
                    : '-'}
                </div>
                <div className="text-xs font-semibold">
                  {/* 24h stats removed: market-data endpoint is not available right now */}
                </div>
              </div>
              <div className="flex-shrink-0">
                {/* Sparkline removed: price from AePricePollingProvider */}
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-b-0">
                <span className="text-[11px] text-[var(--light-font-color)] uppercase tracking-wide">
                  {t('layout.marketCap')}
                </span>
                <span className="text-[11px] text-[var(--standard-font-color)] font-semibold">
                  -
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-b-0">
                <span className="text-[11px] text-[var(--light-font-color)] uppercase tracking-wide">
                  {t('rightRail.volume24h')}
                </span>
                <span className="text-[11px] text-[var(--standard-font-color)] font-semibold">
                  -
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Trending Section removed for now. */}

      {/* Buy AE with ETH (disabled): uncomment BuyAeWidget import above, then the block below.
      <div className="bg-white/[0.03] border border-white/10 rounded-[20px] p-4 shadow-none">
        <BuyAeWidget embedded />
      </div>
      */}

      <GetAeButton />
      <TopTradersCard />

      <QuickActionsCard />
    </div>
  );
};

export default RightRail;
