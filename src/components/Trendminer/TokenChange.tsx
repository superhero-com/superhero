import { TokenDto } from '@/api/generated/models/TokenDto';
import { cn } from '@/lib/utils';
import { DEFAULT_PAST_TIMEFRAME } from '@/utils/constants';

interface TokenChangeProps {
  token: TokenDto;
  hideNewBadge?: boolean;
}

const TokenChange = ({
  token,
  hideNewBadge = false,
}: TokenChangeProps) => {
  // Check if token is new (created less than 24 hours ago)
  const isNewToken = () => {
    const createdDate = new Date(token.created_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff < 24;
  };

  // Format percentage without sign (sign is indicated by triangle and color)
  const formatPercentage = (percentage: number) => {
    const fixed = Math.abs(percentage).toFixed(2);
    return `${fixed}%`;
  };

  const performance = token?.performance?.[DEFAULT_PAST_TIMEFRAME] ?? null;

  if (!performance) return null;

  const changePercent = Number(performance?.current_change_percent ?? 0);
  // Zero and positive values both show as green (like CoinMarketCap)
  const isPositive = changePercent >= 0;

  return (
    <div className="flex items-center gap-2" data-token-address={token?.address || token?.sale_address}>
      {!hideNewBadge && isNewToken() && (
        <span className="px-1 py-1 rounded text-xs font-semibold text-white bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] uppercase tracking-wide">
          NEW
        </span>
      )}

      {
        (changePercent !== 0) && (
          <span
            className={cn(
              'text-sm font-semibold flex items-center gap-0.5 tabular-nums',
              isPositive
                ? 'text-green-400'
                : 'text-red-400',
            )}
          >
            <span className="text-[11px] leading-none">{isPositive ? '▲' : '▼'}</span>
            <span>{formatPercentage(changePercent)}</span>
          </span>
        )
      }

    </div>
  );
};

export default TokenChange;
