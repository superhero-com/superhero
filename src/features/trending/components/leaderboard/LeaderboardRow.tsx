import type { LeaderboardItem } from "../../api/leaderboard";
import { formatNumber } from "../../../../utils/number";
import AddressAvatarWithChainName from "@/@components/Address/AddressAvatarWithChainName";

interface LeaderboardRowProps {
  rank: number;
  item: LeaderboardItem;
  timeframeLabel: string;
}

export function LeaderboardRow({
  rank,
  item,
  timeframeLabel,
}: LeaderboardRowProps) {
  // Simple placeholder gain percentage based on activity presence.
  const hasActivity = Number(item.total_volume || 0) > 0;
  const gainPercentage = hasActivity ? 100 : 0;

  const metricValue = Number(item.total_volume || 0);

  return (
    <div className="grid grid-cols-[60px,minmax(0,2fr),minmax(0,1fr),minmax(0,1fr)] items-center py-3 px-3 border border-white/5 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] transition-colors">
      {/* Rank */}
      <div className="flex items-center justify-center text-sm text-white/80">
        #{rank}
      </div>

      {/* Trader info */}
      <div className="flex items-center gap-3 min-w-0">
        <AddressAvatarWithChainName
          address={item.address}
          showPrimaryOnly
          showBalance={false}
          truncateAddress
          isHoverEnabled={false}
          contentClassName="pb-0 px-2"
        />
      </div>

      {/* Gain */}
      <div className="flex flex-col items-end gap-1">
        <div className="text-sm font-semibold text-emerald-400">
          {gainPercentage.toFixed(0)}%
        </div>
        <div className="text-[11px] text-white/50">{timeframeLabel} Gain</div>
      </div>

      {/* Metric value (volume in AE for now) */}
      <div className="flex flex-col items-end gap-1">
        <div className="text-sm font-mono">
          {formatNumber(metricValue, 2)} AE
        </div>
        <div className="text-[11px] text-white/50">Total Volume</div>
      </div>
    </div>
  );
}


