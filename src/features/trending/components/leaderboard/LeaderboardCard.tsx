import type { LeaderboardItem } from "../../api/leaderboard";
import { formatNumber } from "../../../../utils/number";
import AddressAvatarWithChainName from "@/@components/Address/AddressAvatarWithChainName";
import AeButton from "@/components/AeButton";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";

interface LeaderboardCardProps {
  rank: number;
  item: LeaderboardItem;
  timeframeLabel: string;
  metricLabel: string;
}

export function LeaderboardCard({
  rank,
  item,
  timeframeLabel,
  metricLabel,
}: LeaderboardCardProps) {
  const navigate = useNavigate();

  const pnlUsd = Number(item.pnl_usd || 0);
  const roiPctRaw = item.roi_pct;
  const roiPct =
    roiPctRaw === null || roiPctRaw === undefined
      ? NaN
      : Number(roiPctRaw);
  const aumUsd = Number(item.aum_usd || 0);
  const mddPct = Number(item.mdd_pct || 0);
  const buyTrades = Number(item.buy_count || 0);
  const sellTrades = Number(item.sell_count || 0);
  const createdTokens = Number(item.created_tokens_count || 0);
  const ownedTrends = Number(item.owned_trends_count || 0);
  const sparkline = item.portfolio_value_usd_sparkline ?? [];

  const hasSparkline = Array.isArray(sparkline) && sparkline.length > 1;
  const [isChartHovered, setIsChartHovered] = useState(false);

  const latestPoint = useMemo(() => {
    if (!hasSparkline) return null;
    const [timestamp, value] = sparkline[sparkline.length - 1];
    return {
      timestamp,
      value,
    };
  }, [hasSparkline, sparkline]);

  const gradientId = useMemo(
    () =>
      `leaderboardPortfolioFill-${(item.address || "")
        .toString()
        .replace(/[^a-zA-Z0-9_-]/g, "")}`,
    [item.address]
  );

  const buildSparklinePaths = (
    data: [number, number][],
    width: number,
    height: number,
    paddingX = 4,
    paddingY = 4
  ): { line: string; area: string } => {
    if (!data.length) return { line: "", area: "" };
    const xs = data.map(([t]) => t);
    const ys = data.map(([, v]) => v);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;

    const points = data.map(([t, v]) => {
      const x =
        paddingX +
        ((t - minX) / spanX) * (width - paddingX * 2);
      const y =
        height -
        (paddingY +
          ((v - minY) / spanY) * (height - paddingY * 2));
      return { x, y };
    });

    const line = points
      .map((p, index) => {
        const cmd = index === 0 ? "M" : "L";
        return `${cmd}${p.x.toFixed(2)},${p.y.toFixed(2)}`;
      })
      .join(" ");

    const first = points[0];
    const last = points[points.length - 1];
    const area = `${line} L${last.x.toFixed(2)},${(
      height - paddingY
    ).toFixed(2)} L${first.x.toFixed(2)},${(
      height - paddingY
    ).toFixed(2)} Z`;

    return { line, area };
  };

  return (
    <div className="flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border border-white/10 bg-[#050712] backdrop-blur-[18px] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      {/* Header: rank + trader identity */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-[11px] sm:text-xs text-white/80">
            #{rank}
          </div>
          <AddressAvatarWithChainName
            address={item.address}
            showPrimaryOnly
            showBalance={false}
            truncateAddress
            isHoverEnabled={false}
            contentClassName="pb-0 px-2"
          />
        </div>
      </div>

      {/* Main metrics row */}
      <div className="flex items-stretch gap-3 sm:gap-4">
        <div className="flex flex-col gap-1.5 sm:gap-1">
          <span className="text-[10px] sm:text-[11px] uppercase tracking-wide text-white/50">
            {timeframeLabel} PnL (USD)
          </span>
          <span
            className={`text-xl sm:text-2xl font-semibold ${
              pnlUsd < 0
                ? "text-red-400"
                : pnlUsd > 0
                ? "text-emerald-400"
                : "text-white"
            }`}
          >
            {pnlUsd < 0 ? "-$" : "$"}
            {Math.abs(pnlUsd).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span
            className={`text-[10px] sm:text-[11px] ${
              isNaN(roiPct)
                ? "text-white/40"
                : roiPct < 0
                ? "text-red-300"
                : roiPct > 0
                ? "text-emerald-300"
                : "text-white/70"
            }`}
          >
            {timeframeLabel} ROI{" "}
            {isNaN(roiPct)
              ? "--"
              : `${roiPct > 0 ? "+" : roiPct < 0 ? "-" : ""}${Math.abs(
                  roiPct
                ).toFixed(2)}%`}
          </span>
        </div>
        {/* Portfolio value sparkline */}
        <div className="hidden sm:flex flex-1 items-center justify-end">
          <div
            className="relative w-28 h-14 rounded-xl bg-[#050712] border border-white/5 flex items-center justify-center px-1 overflow-hidden"
            onMouseEnter={() => setIsChartHovered(true)}
            onMouseLeave={() => setIsChartHovered(false)}
          >
            {hasSparkline ? (
              (() => {
                const { line, area } = buildSparklinePaths(
                  sparkline,
                  112,
                  56
                );
                return (
                  <svg
                    viewBox="0 0 112 56"
                    className="w-full h-full"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient
                        id={gradientId}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="rgba(34,197,94,0.35)"
                        />
                        <stop
                          offset="100%"
                          stopColor="rgba(34,197,94,0.02)"
                        />
                      </linearGradient>
                    </defs>
                    <path
                      d={area}
                      fill={`url(#${gradientId})`}
                      stroke="none"
                    />
                    <path
                      d={line}
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                );
              })()
            ) : (
              <div className="w-full h-6 rounded-full bg-white/5" />
            )}

            {isChartHovered && latestPoint && (
              <div className="absolute top-1 right-1 px-2 py-1 rounded-md bg-black/80 border border-white/10 text-[10px] text-white/80 shadow-lg pointer-events-none">
                <div className="font-semibold">
                  ${formatNumber(latestPoint.value, 2)}
                </div>
                <div className="text-[9px] text-white/60">
                  Latest portfolio value
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-[10px] sm:text-[11px] text-white/60 mt-1 sm:mt-0">
        <div className="flex flex-col gap-1">
          <span className="uppercase tracking-wide">AUM</span>
          <span className="text-xs font-mono text-white">
            ${formatNumber(aumUsd, 2)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="uppercase tracking-wide">
            {timeframeLabel} MDD
          </span>
          <span className="text-xs font-mono text-white">
            {isNaN(mddPct) ? "--" : `${mddPct.toFixed(2)}%`}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="uppercase tracking-wide">Owned Trends</span>
          <span className="text-xs font-mono text-white">
            {formatNumber(ownedTrends, 0)}
          </span>
        </div>
      </div>

      {/* Additional breakdown */}
      <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-white/55 mt-1">
        <span>
          Buys:{" "}
          <span className="text-emerald-300 font-mono">
            {formatNumber(buyTrades, 0)}
          </span>
        </span>
        <span>
          Sells:{" "}
          <span className="text-red-300 font-mono">
            {formatNumber(sellTrades, 0)}
          </span>
        </span>
        <span>
          Created:{" "}
          <span className="text-white font-mono">
            {formatNumber(createdTokens, 0)}
          </span>
        </span>
      </div>

      {/* CTA row – single button, no copy/mock */}
      <div className="pt-1">
        <AeButton
          variant="primary"
          className="w-full h-10 text-sm font-semibold bg-gradient-to-r from-yellow-400 to-yellow-500 text-black hover:from-yellow-300 hover:to-yellow-400"
          onClick={() => navigate(`/users/${item.address}`)}
        >
          View profile
        </AeButton>
      </div>
    </div>
  );
}


