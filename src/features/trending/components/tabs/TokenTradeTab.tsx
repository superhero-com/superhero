import React from 'react';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import type { TokenPriceMovementDto } from '@/api/generated/models/TokenPriceMovementDto';
import TokenCandlestickChart from '@/components/charts/TokenCandlestickChart';
import PriceDataFormatter from '@/features/shared/components/PriceDataFormatter';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import TokenCandlestickChartSkeleton from '../Skeletons/TokenCandlestickChartSkeleton';

type TokenTradeTabProps = {
  token?: TokenDto | null;
  tokenPerformance?: TokenPriceMovementDto | null;
  isLoading?: boolean;
  isTokenPending?: boolean;
  onBuy: () => void;
  onSell: () => void;
};

const ChangePill = ({ tokenPerformance }: { tokenPerformance?: TokenPriceMovementDto | null }) => {
  const pct = tokenPerformance?.past_24h?.current_change_percent ?? 0;
  const isPositive = pct >= 0;
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs font-semibold tabular-nums', isPositive ? 'text-green-400' : 'text-red-400')}>
      {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
      {Math.abs(pct).toFixed(2)}%
    </span>
  );
};

export const TokenTradeTab = ({
  token,
  tokenPerformance,
  isLoading = false,
  isTokenPending = false,
  onBuy,
  onSell,
}: TokenTradeTabProps) => {
  const performanceStatus = React.useMemo(() => ([
    { id: 'past_24h' as const, name: 'Today' },
    { id: 'past_7d' as const, name: '7 Days' },
    { id: 'past_30d' as const, name: '30 Days' },
    { id: 'all_time' as const, name: 'All-Time' },
  ].map((range) => {
    const p = tokenPerformance?.[range.id];
    const direction = String(p?.current_change_direction || '');
    const isUp = direction === 'up' || direction === 'positive';
    const isDown = direction === 'down' || direction === 'negative';
    const changePercent = typeof p?.current_change_percent === 'number'
      ? `${p.current_change_percent.toFixed(2)}%`
      : '--';
    return {
      ...range,
      isUp,
      isDown,
      changePercent,
    };
  })), [tokenPerformance]);

  if (!token) {
    return (
      <div className="px-4 py-8 text-center text-white/60">
        No token selected.
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Price header */}
      <div className="px-4 pt-2">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-xs text-white/60">Price</div>
              <ChangePill tokenPerformance={tokenPerformance} />
            </div>
            {token?.price_data ? (
              <PriceDataFormatter
                priceData={token.price_data}
                className="text-sm font-semibold"
                symbolTextClassName="text-2xl font-bold"
                fiatPriceTextClassName="text-xs"
              />
            ) : (
              <div className="text-3xl font-bold">—</div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-right">
            <div>
              <div className="text-[10px] text-white/60">24h High</div>
              {tokenPerformance?.past_24h?.high ? (
                <PriceDataFormatter
                  priceData={tokenPerformance.past_24h.high}
                  symbolTextClassName="text-xs"
                  hideFiatPrice
                  hideSymbol
                />
              ) : (
                <div className="text-xs font-semibold text-white/70">—</div>
              )}
            </div>
            <div>
              <div className="text-[10px] text-white/60">All‑Time High</div>
              {tokenPerformance?.all_time?.high ? (
                <PriceDataFormatter
                  priceData={tokenPerformance.all_time.high}
                  symbolTextClassName="text-xs"
                  hideFiatPrice
                  hideSymbol
                />
              ) : (
                <div className="text-xs font-semibold text-white/70">—</div>
              )}
            </div>
            <div>
              <div className="text-[10px] text-white/60">24h Low</div>
              {tokenPerformance?.past_24h?.low ? (
                <PriceDataFormatter
                  priceData={tokenPerformance.past_24h.low}
                  symbolTextClassName="text-xs"
                  hideFiatPrice
                  hideSymbol
                />
              ) : (
                <div className="text-xs font-semibold text-white/70">—</div>
              )}
            </div>
            <div>
              <div className="text-[10px] text-white/60">All‑Time Low</div>
              {tokenPerformance?.all_time?.low ? (
                <PriceDataFormatter
                  priceData={tokenPerformance.all_time.low}
                  hideFiatPrice
                  hideSymbol
                  className="text-xs font-semibold"
                />
              ) : (
                <div className="text-xs font-semibold text-white/70">—</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="mt-3 px-3">
        {(isLoading && !token?.sale_address) ? (
          <TokenCandlestickChartSkeleton boilerplate={isTokenPending} />
        ) : (
          token?.sale_address ? (
            <TokenCandlestickChart token={token} height={window.innerHeight * 0.4} className="w-full" />
          ) : null
        )}
      </div>

      {/* Performance row */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between gap-4 overflow-x-auto">
          {performanceStatus.map((s) => (
            <div key={s.id} className="flex flex-col items-center min-w-[68px]">
              <div className="text-[10px] text-white/60 mb-1">{s.name}</div>
              <div className={cn(
                'text-sm font-semibold tabular-nums',
                !tokenPerformance ? 'text-white/40' : '',
                s.isUp ? 'text-green-400' : '',
                s.isDown ? 'text-red-400' : '',
                (!s.isUp && !s.isDown) ? 'text-white/60' : '',
              )}
              >
                {s.changePercent}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Buy / Sell actions (open trade sheet) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-[#0a0a0f]/85 backdrop-blur-xl">
        <div className="max-w-[min(1536px,100%)] mx-auto px-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onBuy}
              className="w-full rounded-xl bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-semibold py-3"
            >
              Buy
            </button>
            <button
              type="button"
              onClick={onSell}
              className="w-full rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-semibold py-3"
            >
              Sell
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

