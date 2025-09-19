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
    <div
      className={cn(
        "inline-flex items-center gap-1.5 bg-white/5 rounded-full p-0.5 mb-3 border border-white/10 self-start",
        className
      )}
    >
      <AeButton
        onClick={() => onSortChange("latest")}
        variant={sortBy === "latest" ? "default" : "ghost"}
        size="xs"
        noShadow={true}
        className={cn(
          "rounded-full px-3 py-1 text-xs font-semibold transition-all w-24",
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
          "rounded-full px-3 py-1 text-xs font-semibold transition-all w-24",
          sortBy === "hot"
            ? "bg-[#1161FE] text-white hover:bg-[#1161FE] focus:bg-[#1161FE]"
            : "text-white/70 hover:text-white hover:bg-white/10 focus:text-white focus:bg-white/10"
        )}
      >
        Popular
      </AeButton>
    </div>
  )
);

SortControls.displayName = "SortControls";

export default SortControls;
