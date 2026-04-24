import React, {
  memo, useEffect, useRef, useState,
} from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  ChevronDown, SlidersHorizontal, RotateCcw, Rocket, X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
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

/**
 * Tailwind `lg` — matches `WebAppHeader` (`hidden lg:flex`).
 * Below this width the fixed rail is absent.
 */
const DESKTOP_SIDEBAR_MEDIA_QUERY = '(min-width: 1024px)';
/** `w-64` rail + same gutter as `top`/`right`/`bottom` in collisionPadding */
const SIDEBAR_COLLISION_PADDING_LEFT = 256 + 16;
const COLLISION_PADDING_EDGE = 16;

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
    sortBy, onSortChange, className = '', popularWindow = '24h', onPopularWindowChange, popularFeedEnabled = true,
    popularWeights = {}, onPopularWeightsChange,
  }: SortControlsProps) => {
    const mobileSortRef = useRef<HTMLDivElement>(null);
    const [customizeOpen, setCustomizeOpen] = useState(false);
    const [mobileSortOpen, setMobileSortOpen] = useState(false);
    const [mobileCustomizeOpen, setMobileCustomizeOpen] = useState(false);

    const getHasDesktopSidebar = () => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
      return window.matchMedia(DESKTOP_SIDEBAR_MEDIA_QUERY).matches;
    };
    const [hasDesktopSidebar, setHasDesktopSidebar] = useState(getHasDesktopSidebar);

    useEffect(() => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
      const mq = window.matchMedia(DESKTOP_SIDEBAR_MEDIA_QUERY);
      const onChange = () => setHasDesktopSidebar(mq.matches);
      onChange();
      if (mq.addEventListener) {
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
      }
      mq.addListener?.(onChange);
      return () => mq.removeListener?.(onChange);
    }, []);

    const hasCustomWeights = Object.keys(popularWeights).length > 0;

    const getEffectiveWeight = (key: WeightKey): WeightValue => popularWeights[key] ?? 'med';

    const handleWindowChange = (value: '24h' | '7d' | 'all') => {
      if (onPopularWindowChange) onPopularWindowChange(value);
    };

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

    const handleResetCustomSettings = () => {
      handleResetWeights();
      handleWindowChange('24h');
    };

    useEffect(() => {
      if (!mobileSortOpen) return undefined;

      const handlePointerDown = (event: MouseEvent | TouchEvent) => {
        if (!mobileSortRef.current?.contains(event.target as Node)) {
          setMobileSortOpen(false);
        }
      };

      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('touchstart', handlePointerDown);

      return () => {
        document.removeEventListener('mousedown', handlePointerDown);
        document.removeEventListener('touchstart', handlePointerDown);
      };
    }, [mobileSortOpen]);

    useEffect(() => {
      setMobileSortOpen(false);
      if (sortBy !== 'hot') {
        setMobileCustomizeOpen(false);
        setCustomizeOpen(false);
      }
    }, [sortBy, popularWindow]);

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

    const handleMobileSortToggle = (newSort: 'hot' | 'latest') => {
      setMobileSortOpen(false);
      onSortChange(newSort);
    };

    const hasNonDefaultWindow = popularWindow !== '24h';
    const hasCustomSettings = hasCustomWeights || hasNonDefaultWindow;

    const renderCustomizeControls = (isMobile = false) => (
      <>
        {!isMobile && (
          <div className="px-4 pt-3 pb-2 flex items-center justify-between border-b border-white/10">
            <span className="text-xs font-semibold text-white/90 uppercase tracking-wider">Customize Feed</span>
            {hasCustomSettings && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleResetCustomSettings();
                }}
                className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white/80 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>
        )}
        <div className="px-4 pt-3 pb-2">
          <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Time Window</span>
          <div className="mt-1.5 inline-flex items-center gap-0.5 bg-white/5 rounded-full p-0.5 border border-white/10">
            {(['24h', '7d', 'all'] as const).map((tf) => {
              const isActive = popularWindow === tf;
              const label = getPopularLabel(tf);
              return (
                <button
                  type="button"
                  key={tf}
                  onClick={(e) => {
                    if (!isMobile) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                    handleWindowChange(tf);
                  }}
                  className={cn(
                    'px-3 py-1.5 text-[11px] rounded-full border transition-all duration-200',
                    isActive
                      ? 'bg-[#1161FE] text-white border-transparent shadow-sm'
                      : 'bg-transparent text-white/70 border-transparent hover:text-white/90 hover:bg-white/10',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="px-4 pt-2 pb-1">
          <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">Weights</span>
        </div>
        <div className="px-3 pb-3 flex flex-col gap-2">
          {WEIGHT_KEYS.map((key) => (
            <div key={key} className="flex items-center justify-between gap-3 px-1">
              <span className="text-xs text-white/70 min-w-[90px]">{WEIGHT_LABELS[key]}</span>
              <div className="inline-flex items-center gap-0.5 bg-white/5 rounded-full p-0.5 border border-white/10">
                {WEIGHT_VALUES.map((val) => {
                  const isActive = getEffectiveWeight(key) === val;
                  return (
                    <button
                      type="button"
                      key={val}
                      onClick={(e) => {
                        if (!isMobile) {
                          e.preventDefault();
                          e.stopPropagation();
                        }
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
      </>
    );

    const renderCustomizeDropdownContent = (minWidth: string) => (
      <DropdownMenuContent
        align="start"
        collisionPadding={{
          top: COLLISION_PADDING_EDGE,
          right: COLLISION_PADDING_EDGE,
          bottom: COLLISION_PADDING_EDGE,
          left: hasDesktopSidebar ? SIDEBAR_COLLISION_PADDING_LEFT : COLLISION_PADDING_EDGE,
        }}
        sideOffset={8}
        className={cn('bg-[#0d0d0d] border-white/15 text-white p-0 rounded-xl shadow-2xl', minWidth)}
        style={{
          background: 'radial-gradient(600px 300px at 50% -20%, rgba(17,97,254,0.08), transparent 60%), #0d0d0d',
        }}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {renderCustomizeControls()}
      </DropdownMenuContent>
    );

    return (
      <div className={cn('w-full mb-0 md:mb-3', className)}>
        {/* Mobile: title with dropdown */}
        <div className="md:hidden">
          <div className="flex items-center justify-between border-b border-white/15 w-screen -mx-[calc((100vw-100%)/2)] px-5 pt-3 pb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div ref={mobileSortRef} className="relative min-w-0">
                {mobileSortOpen && (
                  <div
                    className="absolute left-0 top-[calc(100%+8px)] z-[1200] min-w-[180px] rounded-2xl border border-white/15 bg-[#0d0d0d] p-1 text-white shadow-2xl"
                    style={{
                      background: 'radial-gradient(600px 300px at 50% -20%, rgba(17,97,254,0.08), transparent 60%), #0d0d0d',
                    }}
                    role="menu"
                    aria-label="Feed sort options"
                  >
                    {sortBy === 'hot' ? (
                      <button
                        type="button"
                        onClick={() => handleMobileSortToggle('latest')}
                        className="flex min-h-[44px] w-full items-center rounded-xl px-4 py-2.5 text-left text-sm text-white transition-colors hover:bg-white/10"
                        role="menuitem"
                      >
                        Latest
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleMobileSortToggle('hot')}
                        className="flex min-h-[44px] w-full items-center rounded-xl px-4 py-2.5 text-left text-sm text-white transition-colors hover:bg-white/10"
                        role="menuitem"
                      >
                        Popular
                      </button>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  className="flex items-center gap-2 text-base font-bold text-white tracking-tight [text-shadow:none] [background:none] [-webkit-text-fill-color:white] hover:opacity-80 transition-opacity focus:outline-none"
                  aria-haspopup="menu"
                  aria-expanded={mobileSortOpen}
                  onClick={() => {
                    setMobileCustomizeOpen(false);
                    setMobileSortOpen((open) => !open);
                  }}
                >
                  <span>{getMobileTitle()}</span>
                  <ChevronDown className={cn('h-4 w-4 text-white/70 shrink-0 transition-transform', mobileSortOpen && 'rotate-180')} />
                </button>
              </div>
              {sortBy === 'hot' && (
                <Dialog open={mobileCustomizeOpen} onOpenChange={setMobileCustomizeOpen}>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileSortOpen(false);
                      setMobileCustomizeOpen(true);
                    }}
                    className={cn(
                      'relative overflow-visible p-2.5 rounded-full transition-all duration-200 shrink-0',
                      hasCustomSettings
                        ? 'text-[#1161FE]'
                        : 'text-white/50 hover:text-white/80',
                    )}
                    title="Customize popular feed"
                  >
                    <SlidersHorizontal className="h-5 w-5" />
                    {hasCustomSettings && (
                      <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-[#1161FE] rounded-full ring-2 ring-[#0d0d0d]" />
                    )}
                  </button>
                  <DialogContent
                    hideClose
                    className="!left-0 !right-0 !top-auto !bottom-0 !z-[1200] !w-full !max-w-none !translate-x-0 !translate-y-0 gap-0 rounded-t-[28px] rounded-b-none border-white/15 bg-[#0d0d0d] p-0 text-white shadow-2xl data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-left-0 data-[state=open]:slide-in-from-left-0 data-[state=closed]:zoom-out-100 data-[state=open]:zoom-in-100 sm:!max-w-none"
                  >
                    <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-white/15" />
                    <div className="max-h-[85vh] overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+16px)]">
                      <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 pt-3 pb-3">
                        <div>
                          <DialogTitle className="text-base font-semibold text-white">
                            Customize Feed
                          </DialogTitle>
                          <DialogDescription className="mt-1 text-sm text-white/60">
                            Tune the popular feed ranking and time window.
                          </DialogDescription>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMobileCustomizeOpen(false)}
                          className="rounded-full p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                          aria-label="Close customization panel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                          Popular Feed Settings
                        </span>
                        {hasCustomSettings && (
                          <button
                            type="button"
                            onClick={handleResetCustomSettings}
                            className="flex items-center gap-1 text-[11px] text-white/50 transition-colors hover:text-white/80"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Reset
                          </button>
                        )}
                      </div>
                      {renderCustomizeControls(true)}
                      <div className="px-4 pt-2">
                        <button
                          type="button"
                          onClick={() => setMobileCustomizeOpen(false)}
                          className="flex min-h-[44px] w-full items-center justify-center rounded-2xl bg-[#1161FE] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0e50d8]"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            <Link
              to="/trends/create"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#1161FE] px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-[#0e50d8] active:scale-[0.97] shrink-0"
            >
              <Rocket className="h-3 w-3" />
              Tokenize Trend
            </Link>
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden md:flex w-full items-center gap-2 px-4 py-1.5">
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
            <DropdownMenu open={customizeOpen} onOpenChange={setCustomizeOpen} modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'relative overflow-visible p-2.5 rounded-full border transition-all duration-200',
                    hasCustomSettings
                      ? 'bg-[#1161FE]/20 border-[#1161FE]/50 text-[#1161FE]'
                      : 'bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10',
                  )}
                  title="Customize popular feed"
                >
                  <SlidersHorizontal className="h-5 w-5" />
                  {hasCustomSettings && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#1161FE] rounded-full ring-2 ring-[#0d0d0d]" />
                  )}
                </button>
              </DropdownMenuTrigger>
              {renderCustomizeDropdownContent('min-w-[300px]')}
            </DropdownMenu>
          )}
          <Link
            to="/trends/create"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#1161FE] px-3.5 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-[#0e50d8] active:scale-[0.97] ml-auto"
          >
            <Rocket className="h-3 w-3" />
            Tokenize Trend
          </Link>
        </div>
      </div>
    );
  },
);

SortControls.displayName = 'SortControls';

export default SortControls;
