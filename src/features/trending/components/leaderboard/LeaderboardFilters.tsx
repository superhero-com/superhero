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
  search: string;
  onTimeframeChange: (value: LeaderboardTimeframe) => void;
  onMetricChange: (value: LeaderboardMetric) => void;
  onSearchChange: (value: string) => void;
}

export function LeaderboardFilters({
  timeframe,
  metric,
  search,
  onTimeframeChange,
  onMetricChange,
  onSearchChange,
}: LeaderboardFiltersProps) {
  return (
    <div className="flex w-full items-center gap-3 flex-wrap md:flex-nowrap">
      {/* Timeframe segmented control (1D / 7D / 30D) */}
      <div className="w-full sm:w-auto flex-1 sm:flex-none">
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
      <div className="w-full sm:w-auto flex-shrink-0">
        <Select
          value={metric}
          onValueChange={(value) => onMetricChange(value as LeaderboardMetric)}
        >
          <SelectTrigger className="px-2 py-2 h-10 bg-white/[0.02] text-white border border-white/10 backdrop-blur-[10px] rounded-lg text-xs focus:outline-none focus:border-[#1161FE] transition-all duration-300 hover:bg-white/[0.05] w-full sm:w-auto sm:min-w-[140px]">
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

      {/* Search */}
      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search by token name or symbol"
        className="px-2 py-2 h-10 min-h-[auto] bg-white/[0.02] text-white border border-white/10 backdrop-blur-[10px] rounded-lg text-xs focus:outline-none focus:border-[#1161FE] placeholder-white/50 transition-all duration-300 hover:bg-white/[0.05] w-full md:flex-1 min-w-[160px] md:max-w-none"
      />
    </div>
  );
}


