import React, { memo } from "react";
import { AeButton } from "../../../components/ui/ae-button";
import { cn } from "@/lib/utils";

interface SortControlsProps {
  sortBy: string;
  onSortChange: (sortBy: string) => void;
  className?: string;
  popularWindow?: '24h' | '7d' | 'all';
  onPopularWindowChange?: (value: '24h' | '7d' | 'all') => void;
}

// Component: Sort Controls
const SortControls = memo(
  ({ sortBy, onSortChange, className = "", popularWindow = 'all', onPopularWindowChange }: SortControlsProps) => (
    <div className={cn("w-full mb-3", className)}>
      {/* Mobile: text tabs with bottom divider and active underline */}
      <div className="md:hidden">
        {/* Edge-to-edge bottom divider with proper mobile spacing */}
        <div className="flex items-center justify-center gap-6 border-b border-white/15 w-screen -mx-[calc((100vw-100%)/2)] px-4 -mb-3 md:mb-0">
          <button
            onClick={() => onSortChange("latest")}
            className={cn(
              "relative px-1 py-4 text-xs leading-none font-semibold transition-colors md:px-3 md:py-3 md:text-sm !bg-transparent !shadow-none hover:!bg-transparent focus:!bg-transparent active:!bg-transparent hover:!shadow-none focus:!shadow-none active:!shadow-none focus-visible:!ring-0 focus:!outline-none",
              sortBy === "latest"
                ? "text-white after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-[1px] after:h-0.5 after:bg-[#1161FE] after:rounded-full after:mx-1"
                : "text-white/70"
            )}
          >
            Latest
          </button>
          <button
            onClick={() => onSortChange("hot")}
            className={cn(
              "relative px-1 py-4 text-xs leading-none font-semibold transition-colors md:px-3 md:py-3 md:text-sm !bg-transparent !shadow-none hover:!bg-transparent focus:!bg-transparent active:!bg-transparent hover:!shadow-none focus:!shadow-none active:!shadow-none focus-visible:!ring-0 focus:!outline-none",
              sortBy === "hot"
                ? "text-white after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-[1px] after:h-0.5 after:bg-[#1161FE] after:rounded-full after:mx-1"
                : "text-white/70"
            )}
          >
            Popular
          </button>
        </div>
        {sortBy === 'hot' && (
          <div className="flex items-center justify-center gap-2 px-4 mt-3">
            <select
              value={popularWindow}
              onChange={(e) => onPopularWindowChange && onPopularWindowChange(e.target.value as '24h'|'7d'|'all')}
              className="text-[10px] bg-white/10 border border-white/20 rounded px-2 py-1 text-white outline-none cursor-pointer hover:bg-white/20 transition-colors"
              style={{ colorScheme: 'dark' }}
            >
              <option value="24h" style={{ backgroundColor: '#1a1a1a' }}>Today</option>
              <option value="7d" style={{ backgroundColor: '#1a1a1a' }}>This week</option>
              <option value="all" style={{ backgroundColor: '#1a1a1a' }}>All time</option>
            </select>
          </div>
        )}
      </div>

      {/* Desktop: keep existing pill style */}
      <div className="hidden md:flex w-full items-center gap-2">
        <div className="inline-flex items-center gap-1.5 bg-white/5 rounded-full p-0.5 border border-white/10 md:w-auto">
          <AeButton
            onClick={() => onSortChange("latest")}
            variant={sortBy === "latest" ? "default" : "ghost"}
            size="xs"
            noShadow={true}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-all flex-1 w-full md:w-24 md:uppercase",
              sortBy === "latest"
                ? "bg-[#1161FE] text-white hover:bg-[#1161FE] focus:bg-[#1161FE]"
                : "text-white/70 hover:text-white hover:bg-white/10 focus:text-white focus:bg-white/10"
            )}
          >
            Latest
          </AeButton>
          <AeButton
            onClick={() => onSortChange("hot")}
            variant={sortBy === "hot" ? "default" : "ghost"}
            size="xs"
            noShadow={true}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-all flex-1 w-full md:w-24 md:uppercase",
              sortBy === "hot"
                ? "bg-[#1161FE] text-white hover:bg-[#1161FE] focus:bg-[#1161FE]"
                : "text-white/70 hover:text-white hover:bg-white/10 focus:text-white focus:bg-white/10"
            )}
          >
            Popular
          </AeButton>
        </div>
        {sortBy === 'hot' && (
          <div className="flex items-center gap-2">
            <select
              value={popularWindow}
              onChange={(e) => onPopularWindowChange && onPopularWindowChange(e.target.value as '24h'|'7d'|'all')}
              className="text-[11px] bg-white/10 border border-white/20 rounded px-2 py-1 text-white outline-none cursor-pointer hover:bg-white/20 transition-colors"
              style={{ colorScheme: 'dark' }}
            >
              <option value="24h" style={{ backgroundColor: '#1a1a1a' }}>Today</option>
              <option value="7d" style={{ backgroundColor: '#1a1a1a' }}>This week</option>
              <option value="all" style={{ backgroundColor: '#1a1a1a' }}>All time</option>
            </select>
          </div>
        )}
      </div>
    </div>
  )
);

SortControls.displayName = "SortControls";

export default SortControls;
