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
  const roiRaw = item.roi_pct;
  const roiPct =
    roiRaw === null || roiRaw === undefined
      ? NaN
      : Number(roiRaw);
  const hasRoi = !Number.isNaN(roiPct);

  const pnlUsd = Number(item.pnl_usd ?? 0);

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
        <div
          className={`text-sm font-semibold ${
            !hasRoi
              ? "text-white/40"
              : roiPct > 0
              ? "text-emerald-400"
              : roiPct < 0
              ? "text-red-400"
              : "text-white/70"
          }`}
        >
          {hasRoi ? `${roiPct.toFixed(2)}%` : "--"}
        </div>
        <div className="text-[11px] text-white/50">
          {timeframeLabel} ROI
        </div>
      </div>

      {/* Metric value (PnL in USD for now) */}
      <div className="flex flex-col items-end gap-1">
        <div className="text-sm font-mono">
          ${formatNumber(pnlUsd, 2)}
        </div>
        <div className="text-[11px] text-white/50">
          PnL (USD)
        </div>
      </div>
    </div>
  );
}


