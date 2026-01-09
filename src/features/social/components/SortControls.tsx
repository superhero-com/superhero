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
import { useSectionTheme } from "@/components/layout/AppLayout";
import { useTheme } from "@/contexts/ThemeContext";

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
    const { colors } = useSectionTheme();
    const { isDark } = useTheme();
    
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
    <div className={cn("w-full mb-0 md:mb-3", className)}>
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
              sideOffset={8}
              className="bg-white/5 backdrop-blur-xl border-white/20 text-white min-w-[240px] py-2 rounded-xl shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-4 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-top"
              style={{
                background: "radial-gradient(1200px 400px at -20% -40%, rgba(255,255,255,0.06), transparent 40%), rgba(255, 255, 255, 0.03)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }}
            >
              {sortBy === "hot" ? (
                <>
                  {popularWindow !== "24h" && (
                    <DropdownMenuItem
                      onClick={() => handleMobileOptionSelect("today")}
                      className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
                    >
                      Today
                    </DropdownMenuItem>
                  )}
                  {popularWindow !== "7d" && (
                    <DropdownMenuItem
                      onClick={() => handleMobileOptionSelect("this-week")}
                      className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
                    >
                      This week
                    </DropdownMenuItem>
                  )}
                  {popularWindow !== "all" && (
                    <DropdownMenuItem
                      onClick={() => handleMobileOptionSelect("all-time")}
                      className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
                    >
                      All time
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => handleMobileOptionSelect("latest")}
                    className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
                  >
                    Latest
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <DropdownMenuItem
                    onClick={() => handleMobileOptionSelect("today")}
                    className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
                  >
                    Popular today
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleMobileOptionSelect("this-week")}
                    className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
                  >
                    Popular this week
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleMobileOptionSelect("all-time")}
                    className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
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
        <div 
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full p-0.5 border md:w-auto",
            isDark ? "bg-slate-800/50 border-slate-700" : "bg-white/50 border-gray-200"
          )}
        >
          <AeButton
            onClick={() => onSortChange("hot")}
            variant={sortBy === "hot" ? "default" : "ghost"}
            size="xs"
            noShadow={true}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-semibold transition-all flex-1 w-full md:w-24 md:uppercase",
              sortBy !== "hot" && (isDark 
                ? "text-slate-400 hover:text-white hover:bg-slate-700" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100")
            )}
            style={sortBy === "hot" ? { 
              background: colors.gradient, 
              color: 'white',
              boxShadow: `0 4px 12px ${colors.primary}40`
            } : undefined}
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
              sortBy !== "latest" && (isDark 
                ? "text-slate-400 hover:text-white hover:bg-slate-700" 
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100")
            )}
            style={sortBy === "latest" ? { 
              background: colors.gradient, 
              color: 'white',
              boxShadow: `0 4px 12px ${colors.primary}40`
            } : undefined}
          >
            Latest
          </AeButton>
        </div>
        {sortBy === 'hot' && (
          <div 
            className={cn(
              "inline-flex items-center gap-1 rounded-full p-0.5 border ml-auto",
              isDark ? "bg-slate-800/50 border-slate-700" : "bg-white/50 border-gray-200"
            )}
          >
            {(['24h','7d','all'] as const).map((tf) => {
              const isActive = popularWindow === tf;
              const label = tf === '24h' ? 'Today' : tf === '7d' ? 'This week' : 'All time';
              return (
                <button
                  key={tf}
                  onClick={() => onPopularWindowChange && onPopularWindowChange(tf)}
                  className={cn(
                    'px-3 py-1.5 text-[11px] rounded-full border transition-all duration-300',
                    !isActive && (isDark 
                      ? 'bg-transparent text-slate-400 border-transparent hover:bg-slate-700' 
                      : 'bg-transparent text-gray-600 border-transparent hover:bg-gray-100')
                  )}
                  style={isActive ? {
                    background: colors.gradient,
                    color: 'white',
                    border: 'transparent',
                    boxShadow: `0 4px 12px ${colors.primary}40`
                  } : undefined}
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
