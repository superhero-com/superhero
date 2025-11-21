import type { LeaderboardItem } from "../../api/leaderboard";
import { LeaderboardRow } from "./LeaderboardRow";

interface LeaderboardTableProps {
  items: LeaderboardItem[];
  timeframeLabel: string;
  metricLabel: string;
}

export function LeaderboardTable({
  items,
  timeframeLabel,
  metricLabel,
}: LeaderboardTableProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="grid grid-cols-[60px,minmax(0,2fr),minmax(0,1fr),minmax(0,1fr)] py-2 px-3 text-[11px] uppercase tracking-wide text-white/50">
        <div className="text-center">Rank</div>
        <div>Trader</div>
        <div className="text-right">{timeframeLabel} Gain</div>
        <div className="text-right">{metricLabel}</div>
      </div>

      {/* Rows */}
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <LeaderboardRow
            key={item.address}
            rank={index + 1}
            item={item}
            timeframeLabel={timeframeLabel}
          />
        ))}
      </div>
    </div>
  );
}


