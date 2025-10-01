import React, { memo } from "react";
import { AeButton } from "../../../components/ui/ae-button";
import { cn } from "@/lib/utils";

interface SortControlsProps {
  sortBy: string;
  onSortChange: (sortBy: string) => void;
  className?: string;
}

// Component: Sort Controls
const SortControls = memo(
  ({ sortBy, onSortChange, className = "" }: SortControlsProps) => (
    <div className={cn("w-full mb-3", className)}>
      {/* Mobile: text tabs with bottom divider and active underline */}
      <div className="md:hidden">
        {/* Edge-to-edge bottom divider */}
        <div className="flex w-screen -mx-[calc((100vw-100%)/2)] items-center justify-center gap-12 border-b border-white/15">
          <button
            onClick={() => onSortChange("latest")}
            className={cn(
              "relative px-1 pt-0 pb-0 text-xs leading-none font-semibold transition-colors !bg-transparent !shadow-none hover:!bg-transparent focus:!bg-transparent active:!bg-transparent hover:!shadow-none focus:!shadow-none active:!shadow-none focus-visible:!ring-0 focus:!outline-none",
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
              "relative px-1 pt-0 pb-0 text-xs leading-none font-semibold transition-colors !bg-transparent !shadow-none hover:!bg-transparent focus:!bg-transparent active:!bg-transparent hover:!shadow-none focus:!shadow-none active:!shadow-none focus-visible:!ring-0 focus:!outline-none",
              sortBy === "hot"
                ? "text-white after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-[1px] after:h-0.5 after:bg-[#1161FE] after:rounded-full after:mx-1"
                : "text-white/70"
            )}
          >
            Popular
          </button>
        </div>
      </div>

      {/* Desktop: keep existing pill style */}
      <div className="hidden md:inline-flex w-full items-center gap-1.5 bg-white/5 rounded-full p-0.5 border border-white/10 md:w-auto">
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
    </div>
  )
);

SortControls.displayName = "SortControls";

export default SortControls;
