import React, { memo, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, SlidersHorizontal, RotateCcw } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AeButton } from '../../../components/ui/ae-button';

export type WeightKey =
  | 'comments'
  | 'tipsAmountAE'
  | 'tipsCount'
  | 'uniqueTippers'
  | 'trendingBoost'
  | 'contentQuality'
  | 'reads'
  | 'interactionsPerHour';

export type WeightValue = 'low' | 'med' | 'high';

export type PopularWeights = Partial<Record<WeightKey, WeightValue>>;

const WEIGHT_LABELS: Record<WeightKey, string> = {
  comments: 'Comments',
  tipsAmountAE: 'Tip Amount',
  tipsCount: 'Tip Count',
  uniqueTippers: 'Unique Tippers',
  trendingBoost: 'Trending Boost',
  contentQuality: 'Content Quality',
  reads: 'Reads',
  interactionsPerHour: 'Activity Rate',
};

const WEIGHT_KEYS = Object.keys(WEIGHT_LABELS) as WeightKey[];
const WEIGHT_VALUES: WeightValue[] = ['low', 'med', 'high'];

interface SortControlsProps {
  sortBy: string;
  onSortChange: (sortBy: string) => void;
  className?: string;
  popularWindow?: '24h' | '7d' | 'all';
  onPopularWindowChange?: (value: '24h' | '7d' | 'all') => void;
  popularFeedEnabled?: boolean;
  popularWeights?: PopularWeights;
  onPopularWeightsChange?: (weights: PopularWeights) => void;
}

// Component: Sort Controls
const SortControls = memo(
  ({
    sortBy, onSortChange, className = '', popularWindow = 'all', onPopularWindowChange, popularFeedEnabled = true,
    popularWeights = {}, onPopularWeightsChange,
  }: SortControlsProps) => {
    const [customizeOpen, setCustomizeOpen] = useState(false);

    const hasCustomWeights = Object.keys(popularWeights).length > 0;

    const getEffectiveWeight = (key: WeightKey): WeightValue => popularWeights[key] ?? 'med';

    const handleWeightChange = (key: WeightKey, value: WeightValue) => {
      if (!onPopularWeightsChange) return;
      const next = { ...popularWeights };
      const effective = getEffectiveWeight(key);
      if (effective === value) return;
      if (value === 'med') {
        delete next[key];
      } else {
        next[key] = value;
      }
      onPopularWeightsChange(next);
    };

    const handleResetWeights = () => {
      if (onPopularWeightsChange) onPopularWeightsChange({});
    };
    // Show "Latest Feed" title if popular feed is disabled
    if (!popularFeedEnabled) {
      return (
        <div className={cn('w-full mb-0 md:mb-3 mt-4 md:mt-0', className)}>
          <h2 className="text-lg md:text-lg font-bold text-white tracking-tight [text-shadow:none] [background:none] [-webkit-text-fill-color:white]">
            Latest Feed
          </h2>
          {/* Mobile horizontal line */}
          <div className="md:hidden border-b border-white/15 w-screen -mx-[calc((100vw-100%)/2)] mt-3" />
        </div>
      );
    }

    // Helper function to get the display title
    const getPopularLabel = (window: '24h' | '7d' | 'all') => {
      if (window === '24h') return 'Today';
      if (window === '7d') return 'This week';
      return 'All time';
    };

    const getMobileTitle = () => {
      if (sortBy === 'latest') {
        return 'Latest';
      }
      // Popular feed
      const timeLabel = getPopularLabel(popularWindow);
      return `Popular ${timeLabel.toLowerCase()}`;
    };

    // Helper function to handle dropdown selection
    const handleMobileOptionSelect = (option: string) => {
      if (option === 'latest') {
        onSortChange('latest');
      } else if (option === 'this-week') {
        onSortChange('hot');
        if (onPopularWindowChange) {
          onPopularWindowChange('7d');
        }
      } else if (option === 'all-time') {
        onSortChange('hot');
        if (onPopularWindowChange) {
          onPopularWindowChange('all');
        }
      } else if (option === 'today') {
        onSortChange('hot');
        if (onPopularWindowChange) {
          onPopularWindowChange('24h');
        }
      }
    };

    return (
      <div className={cn('w-full mb-0 md:mb-3', className)}>
        {/* Mobile: title with dropdown */}
        <div className="md:hidden">
          <div className="flex items-center justify-between border-b border-white/15 w-screen -mx-[calc((100vw-100%)/2)] px-4 pt-3 pb-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 text-base font-bold text-white tracking-tight [text-shadow:none] [background:none] [-webkit-text-fill-color:white] hover:opacity-80 transition-opacity focus:outline-none"
                >
                  <span>{getMobileTitle()}</span>
                  <ChevronDown className="h-4 w-4 text-white/70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={8}
                className="bg-white/5 backdrop-blur-xl border-white/20 text-white min-w-[240px] py-2 rounded-xl shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-4 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-top"
                style={{
                  background: 'radial-gradient(1200px 400px at -20% -40%, rgba(255,255,255,0.06), transparent 40%), rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(16px)',
                  WebkitBackdropFilter: 'blur(16px)',
                }}
              >
                {sortBy === 'hot' ? (
                  <>
                    {popularWindow !== '24h' && (
                    <DropdownMenuItem
                      onClick={() => handleMobileOptionSelect('today')}
                      className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
                    >
                      Today
                    </DropdownMenuItem>
                    )}
                    {popularWindow !== '7d' && (
                    <DropdownMenuItem
                      onClick={() => handleMobileOptionSelect('this-week')}
                      className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
                    >
                      This week
                    </DropdownMenuItem>
                    )}
                    {popularWindow !== 'all' && (
                    <DropdownMenuItem
                      onClick={() => handleMobileOptionSelect('all-time')}
                      className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
                    >
                      All time
                    </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => handleMobileOptionSelect('latest')}
                      className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
                    >
                      Latest
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={() => handleMobileOptionSelect('today')}
                      className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
                    >
                      Popular today
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleMobileOptionSelect('this-week')}
                      className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
                    >
                      Popular this week
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleMobileOptionSelect('all-time')}
                      className="cursor-pointer focus:bg-white/10 focus:text-white px-4 py-2.5 text-sm"
                    >
                      Popular all time
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {sortBy === 'hot' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'relative overflow-visible p-2 rounded-full transition-all duration-200',
                      hasCustomWeights
                        ? 'text-[#1161FE]'
                        : 'text-white/50 hover:text-white/80',
                    )}
                    title="Customize popular feed"
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    {hasCustomWeights && (
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#1161FE] rounded-full ring-2 ring-[#0d0d0d]" />
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="bg-[#0d0d0d] border-white/15 text-white min-w-[280px] p-0 rounded-xl shadow-2xl"
                  style={{
                    background: 'radial-gradient(600px 300px at 50% -20%, rgba(17,97,254,0.08), transparent 60%), #0d0d0d',
                  }}
                  onCloseAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-white/10">
                    <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">Feed Weights</span>
                    {hasCustomWeights && (
                      <button
                        type="button"
                        onClick={handleResetWeights}
                        className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white/80 transition-colors"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Reset
                      </button>
                    )}
                  </div>
                  <div className="p-3 flex flex-col gap-2">
                    {WEIGHT_KEYS.map((key) => (
                      <div key={key} className="flex items-center justify-between gap-3">
                        <span className="text-xs text-white/70 min-w-[90px]">{WEIGHT_LABELS[key]}</span>
                        <div className="inline-flex items-center gap-0.5 bg-white/5 rounded-full p-0.5 border border-white/10">
                          {WEIGHT_VALUES.map((val) => {
                            const isActive = getEffectiveWeight(key) === val;
                            return (
                              <button
                                type="button"
                                key={val}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleWeightChange(key, val);
                                }}
                                className={cn(
                                  'px-2 py-1 text-[10px] rounded-full border transition-all duration-200 capitalize',
                                  isActive
                                    ? 'bg-[#1161FE] text-white border-transparent shadow-sm'
                                    : 'bg-transparent text-white/60 border-transparent hover:text-white/90 hover:bg-white/10',
                                )}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Desktop: keep existing pill style */}
        <div className="hidden md:flex w-full items-center gap-2 pr-1">
          <div className="inline-flex items-center gap-1.5 bg-white/5 rounded-full p-0.5 border border-white/10 md:w-auto">
            <AeButton
              onClick={() => onSortChange('hot')}
              variant={sortBy === 'hot' ? 'default' : 'ghost'}
              size="xs"
              noShadow
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition-all flex-1 w-full md:w-24 md:uppercase',
                sortBy === 'hot'
                  ? 'bg-[#1161FE] text-white hover:bg-[#1161FE] focus:bg-[#1161FE]'
                  : 'text-white/70 hover:text-white hover:bg-white/10 focus:text-white focus:bg-white/10',
              )}
            >
              Popular
            </AeButton>
            <AeButton
              onClick={() => onSortChange('latest')}
              variant={sortBy === 'latest' ? 'default' : 'ghost'}
              size="xs"
              noShadow
              className={cn(
                'rounded-full px-3 py-1 text-xs font-semibold transition-all flex-1 w-full md:w-24 md:uppercase',
                sortBy === 'latest'
                  ? 'bg-[#1161FE] text-white hover:bg-[#1161FE] focus:bg-[#1161FE]'
                  : 'text-white/70 hover:text-white hover:bg-white/10 focus:text-white focus:bg-white/10',
              )}
            >
              Latest
            </AeButton>
          </div>
          {sortBy === 'hot' && (
          <div className="inline-flex items-center gap-2 ml-auto">
            <div className="inline-flex items-center gap-1 bg-white/5 rounded-full p-0.5 border border-white/10">
              {(['24h', '7d', 'all'] as const).map((tf) => {
                const isActive = popularWindow === tf;
                const label = getPopularLabel(tf);
                return (
                  <button
                    type="button"
                    key={tf}
                    onClick={() => {
                      if (onPopularWindowChange) {
                        onPopularWindowChange(tf);
                      }
                    }}
                    className={cn(
                      'px-3 py-1.5 text-[11px] rounded-full border transition-all duration-300',
                      isActive
                        ? 'bg-[#1161FE] text-white border-transparent shadow-sm'
                        : 'bg-transparent text-white/80 border-white/10 hover:bg-white/10',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <DropdownMenu open={customizeOpen} onOpenChange={setCustomizeOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'relative overflow-visible p-1.5 rounded-full border transition-all duration-200',
                    hasCustomWeights
                      ? 'bg-[#1161FE]/20 border-[#1161FE]/50 text-[#1161FE]'
                      : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10',
                  )}
                  title="Customize popular feed"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  {hasCustomWeights && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#1161FE] rounded-full ring-2 ring-[#0d0d0d]" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="bg-[#0d0d0d] border-white/15 text-white min-w-[300px] p-0 rounded-xl shadow-2xl"
                style={{
                  background: 'radial-gradient(600px 300px at 50% -20%, rgba(17,97,254,0.08), transparent 60%), #0d0d0d',
                }}
                onCloseAutoFocus={(e) => e.preventDefault()}
              >
                <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-white/10">
                  <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">Feed Weights</span>
                  {hasCustomWeights && (
                    <button
                      type="button"
                      onClick={handleResetWeights}
                      className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white/80 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Reset
                    </button>
                  )}
                </div>
                <div className="p-3 flex flex-col gap-2">
                  {WEIGHT_KEYS.map((key) => (
                    <div key={key} className="flex items-center justify-between gap-3">
                      <span className="text-xs text-white/70 min-w-[100px]">{WEIGHT_LABELS[key]}</span>
                      <div className="inline-flex items-center gap-0.5 bg-white/5 rounded-full p-0.5 border border-white/10">
                        {WEIGHT_VALUES.map((val) => {
                          const isActive = getEffectiveWeight(key) === val;
                          return (
                            <button
                              type="button"
                              key={val}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleWeightChange(key, val);
                              }}
                              className={cn(
                                'px-2.5 py-1 text-[10px] rounded-full border transition-all duration-200 capitalize',
                                isActive
                                  ? 'bg-[#1161FE] text-white border-transparent shadow-sm'
                                  : 'bg-transparent text-white/60 border-transparent hover:text-white/90 hover:bg-white/10',
                              )}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          )}
        </div>
      </div>
    );
  },
);

SortControls.displayName = 'SortControls';

export default SortControls;
