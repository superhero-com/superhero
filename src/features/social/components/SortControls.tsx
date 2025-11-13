import React, { memo } from "react";
import { AeButton } from "../../../components/ui/ae-button";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SortControlsProps {
  sortBy: string;
  onSortChange: (sortBy: string) => void;
  className?: string;
  popularWindow?: '24h' | '7d' | 'all';
  onPopularWindowChange?: (value: '24h' | '7d' | 'all') => void;
  popularFeedEnabled?: boolean;
}

// Component: Sort Controls
const SortControls = memo(
  ({ sortBy, onSortChange, className = "", popularWindow = 'all', onPopularWindowChange, popularFeedEnabled = true }: SortControlsProps) => {
    // Show "Latest Feed" title if popular feed is disabled
    if (!popularFeedEnabled) {
      return (
        <div className={cn("w-full mb-0 md:mb-3 mt-4 md:mt-0", className)}>
          <h2 className="text-lg md:text-lg font-bold text-white tracking-tight [text-shadow:none] [background:none] [-webkit-text-fill-color:white]">
            Latest Feed
          </h2>
          {/* Mobile horizontal line */}
          <div className="md:hidden border-b border-white/15 w-screen -mx-[calc((100vw-100%)/2)] mt-3"></div>
        </div>
      );
    }

    // Helper function to get the display title
    const getMobileTitle = () => {
      if (sortBy === "latest") {
        return "Latest";
      }
      // Popular feed
      const timeLabel = popularWindow === '24h' ? 'Today' : popularWindow === '7d' ? 'This week' : 'All time';
      return `Popular ${timeLabel.toLowerCase()}`;
    };

    // Helper function to handle dropdown selection
    const handleMobileOptionSelect = (option: string) => {
      if (option === "latest") {
        onSortChange("latest");
      } else if (option === "this-week") {
        onSortChange("hot");
        onPopularWindowChange && onPopularWindowChange("7d");
      } else if (option === "all-time") {
        onSortChange("hot");
        onPopularWindowChange && onPopularWindowChange("all");
      } else if (option === "today") {
        onSortChange("hot");
        onPopularWindowChange && onPopularWindowChange("24h");
      }
    };

    return (
    <div className={cn("w-full mb-3", className)}>
      {/* Mobile: title with dropdown */}
      <div className="md:hidden">
        <div className="flex items-center justify-between border-b border-white/15 w-screen -mx-[calc((100vw-100%)/2)] px-4 pt-3 pb-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 text-base font-bold text-white tracking-tight [text-shadow:none] [background:none] [-webkit-text-fill-color:white] hover:opacity-80 transition-opacity focus:outline-none">
                <span>{getMobileTitle()}</span>
                <ChevronDown className="h-4 w-4 text-white/70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="start" 
              className="bg-[#0C0C14] border-white/10 text-white min-w-[180px]"
            >
              {sortBy === "hot" ? (
                <>
                  {popularWindow !== "24h" && (
                    <DropdownMenuItem
                      onClick={() => handleMobileOptionSelect("today")}
                      className="cursor-pointer focus:bg-white/10 focus:text-white"
                    >
                      Today
                    </DropdownMenuItem>
                  )}
                  {popularWindow !== "7d" && (
                    <DropdownMenuItem
                      onClick={() => handleMobileOptionSelect("this-week")}
                      className="cursor-pointer focus:bg-white/10 focus:text-white"
                    >
                      This week
                    </DropdownMenuItem>
                  )}
                  {popularWindow !== "all" && (
                    <DropdownMenuItem
                      onClick={() => handleMobileOptionSelect("all-time")}
                      className="cursor-pointer focus:bg-white/10 focus:text-white"
                    >
                      All time
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => handleMobileOptionSelect("latest")}
                    className="cursor-pointer focus:bg-white/10 focus:text-white"
                  >
                    Latest
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => handleMobileOptionSelect("today")}
                    className="cursor-pointer focus:bg-white/10 focus:text-white"
                  >
                    Popular today
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleMobileOptionSelect("this-week")}
                    className="cursor-pointer focus:bg-white/10 focus:text-white"
                  >
                    Popular this week
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleMobileOptionSelect("all-time")}
                    className="cursor-pointer focus:bg-white/10 focus:text-white"
                  >
                    Popular all time
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Desktop: keep existing pill style */}
      <div className="hidden md:flex w-full items-center justify-between gap-2">
        <div className="inline-flex items-center gap-1.5 bg-white/5 rounded-full p-0.5 border border-white/10 md:w-auto">
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
        </div>
        {sortBy === 'hot' && (
          <div className="inline-flex items-center gap-1 bg-white/5 rounded-full p-0.5 border border-white/10 ml-auto">
            {(['24h','7d','all'] as const).map((tf) => {
              const isActive = popularWindow === tf;
              const label = tf === '24h' ? 'Today' : tf === '7d' ? 'This week' : 'All time';
              return (
                <button
                  key={tf}
                  onClick={() => onPopularWindowChange && onPopularWindowChange(tf)}
                  className={cn(
                    'px-3 py-1.5 text-[11px] rounded-full border transition-all duration-300',
                    isActive
                      ? 'bg-[#1161FE] text-white border-transparent shadow-sm'
                      : 'bg-transparent text-white/80 border-white/10 hover:bg-white/10'
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
    );
  }
);

SortControls.displayName = "SortControls";

export default SortControls;
