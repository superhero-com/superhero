import {
  LEADERBOARD_METRIC_OPTIONS,
  LEADERBOARD_TIMEFRAME_OPTIONS,
} from "../../constants/leaderboard";
import type {
  LeaderboardMetric,
  LeaderboardTimeframe,
} from "../../api/leaderboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../../components/ui/select";

interface LeaderboardFiltersProps {
  timeframe: LeaderboardTimeframe;
  metric: LeaderboardMetric;
  onTimeframeChange: (value: LeaderboardTimeframe) => void;
  onMetricChange: (value: LeaderboardMetric) => void;
}

export function LeaderboardFilters({
  timeframe,
  metric,
  onTimeframeChange,
  onMetricChange,
}: LeaderboardFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row w-full gap-3 md:items-center">
      {/* Timeframe segmented control */}
      <div className="w-full md:w-auto flex-1">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] uppercase tracking-wide text-white/40">
            Timeframe
          </span>
        </div>
        <div className="flex w-full items-center justify-between gap-2">
          {LEADERBOARD_TIMEFRAME_OPTIONS.map((option) => {
            const isActive = option.value === timeframe;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onTimeframeChange(option.value)}
                className={`flex-1 px-2 py-2 h-10 text-xs rounded-lg border transition-all duration-300 focus:outline-none ${
                  isActive
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-lg"
                    : "bg-white/[0.02] text-white border-white/10 hover:bg-white/[0.05]"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Metric selector */}
      <div className="w-full md:w-auto flex-shrink-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[11px] uppercase tracking-wide text-white/40">
            Sort by
          </span>
        </div>
        <div className="w-full md:w-auto">
          <Select
            value={metric}
            onValueChange={(value) => onMetricChange(value as LeaderboardMetric)}
          >
            <SelectTrigger className="px-2 py-2 h-10 bg-white/[0.02] text-white border border-white/10 backdrop-blur-[10px] rounded-lg text-xs focus:outline-none focus:border-[#1161FE] transition-all duration-300 hover:bg-white/[0.05] w-full md:min-w-[140px]">
              <SelectValue placeholder="Metric" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-white/10">
              {LEADERBOARD_METRIC_OPTIONS.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  className="text-white hover:bg-white/10 text-xs"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}


