import { PriceDataFormatter } from '@/features/shared/components';
import { PairSummaryDto } from '@/api/generated';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AppSelect, { Item as AppSelectItem } from '@/components/inputs/AppSelect';

interface PoolStatsOverviewProps {
  pairSummary?: PairSummaryDto;
}

type Period = '24h' | '7d' | '30d';

export const PoolStatsOverview = ({ pairSummary }: PoolStatsOverviewProps) => {
  const { t } = useTranslation('dex');
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('24h');

  const priceChangePercentage = Number(
    pairSummary?.change?.[selectedPeriod]?.price_change?.percentage || 0,
  );
  const priceChangeValue = Number(
    pairSummary?.change?.[selectedPeriod]?.price_change?.value || 0,
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Volume Card */}
      <div className="liquid-glass p-5 rounded-xl relative overflow-hidden">
        <div className="text-xs text-white/60 mb-2 font-semibold uppercase tracking-wide flex items-center gap-1.5">
          📈
          {' '}
          {t('poolStats.totalVolume')}
        </div>
        <div className="text-2xl font-extrabold text-blue-400 mb-1 font-mono">
          <PriceDataFormatter priceData={pairSummary?.total_volume} bignumber />
        </div>
        <div className="text-xs text-white/60 font-medium">
          {t('poolStats.allTimeTradingVolume')}
        </div>
      </div>

      {/* Volume Card with Dropdown */}
      <div className="liquid-glass p-5 rounded-xl relative overflow-hidden">
        <div className="text-xs text-white/60 mb-2 font-semibold uppercase tracking-wide flex items-center justify-between gap-1.5">
          <span className="flex items-center gap-1.5">
            📊
            {t('poolStats.volume')}
          </span>
          <AppSelect
            value={selectedPeriod}
            onValueChange={(v) => setSelectedPeriod(v as Period)}
            triggerClassName="text-[10px] bg-white/10 border border-white/20 rounded px-2 py-1 text-white outline-none cursor-pointer hover:bg-white/20 transition-colors"
            contentClassName="bg-[#1a1a1a] border-white/20"
          >
            <AppSelectItem value="24h">24h</AppSelectItem>
            <AppSelectItem value="7d">7d</AppSelectItem>
            <AppSelectItem value="30d">30d</AppSelectItem>
          </AppSelect>
        </div>
        <div className="text-2xl font-extrabold text-purple-400 mb-1 font-mono">
          <PriceDataFormatter
            priceData={pairSummary?.change?.[selectedPeriod]?.volume}
            bignumber
          />
        </div>
        <div className="text-xs text-white/60 font-medium">
          {(() => {
            switch (selectedPeriod) {
              case '24h':
                return t('poolStats.last24Hours');
              case '7d':
                return t('poolStats.last7Days');
              case '30d':
                return t('poolStats.last30Days');
              default:
                return t('poolStats.last24Hours');
            }
          })()}
        </div>
      </div>

      {/* Price Change Card with Dropdown */}
      <div className="liquid-glass p-5 rounded-xl relative overflow-hidden">
        <div className="text-xs text-white/60 mb-2 font-semibold uppercase tracking-wide flex items-center justify-between gap-1.5">
          <span className="flex items-center gap-1.5">
            📊
            {t('poolStats.priceChange')}
          </span>
          <AppSelect
            value={selectedPeriod}
            onValueChange={(v) => setSelectedPeriod(v as Period)}
            triggerClassName="text-[10px] bg-white/10 border border-white/20 rounded px-2 py-1 text-white outline-none cursor-pointer hover:bg-white/20 transition-colors"
            contentClassName="bg-[#1a1a1a] border-white/20"
          >
            <AppSelectItem value="24h">24h</AppSelectItem>
            <AppSelectItem value="7d">7d</AppSelectItem>
            <AppSelectItem value="30d">30d</AppSelectItem>
          </AppSelect>
        </div>
        <div
          className={`text-2xl font-extrabold mb-1 font-mono ${
            priceChangePercentage >= 0 ? 'text-bull' : 'text-bear'
          }`}
        >
          {priceChangePercentage >= 0 ? '+' : ''}
          {priceChangePercentage.toFixed(2)}
          %
        </div>
        <div className="text-xs text-white/60 font-medium">
          $
          {priceChangeValue.toFixed(6)}
        </div>
      </div>
    </div>
  );
};
