import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ConnectWalletButton from '../../../components/ConnectWalletButton';
import RecentActivity from '../../../components/dex/supporting/RecentActivity';
import { useAccount } from '../../../hooks';
import { AddLiquidityForm, LiquidityPositionCard, RemoveLiquidityForm } from '../components';
import { PoolProvider, usePool } from '../context/PoolProvider';
import { useLiquidityPositions } from '../hooks';
import Spinner from '../../../components/Spinner';
import { Droplets, X, LayoutGrid } from 'lucide-react';

type LayoutOption = 'option1' | 'option2' | 'option3' | 'option4' | 'option5' | 'option6' | 'option7' | 'option8';

function PoolContent() {
  const navigate = useNavigate();
  const { activeAccount } = useAccount();
  const { positions, loading, error, refreshPositions } = useLiquidityPositions();
  const { selectPositionForAdd, selectPositionForRemove, currentAction } = usePool();
  const [layoutOption, setLayoutOption] = useState<LayoutOption>('option1');
  const [showSwitcher, setShowSwitcher] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleFormSelect = () => {
    // Focus on the forms section
    const formsSection = document.getElementById('liquidity-forms-section');
    if (formsSection) {
      formsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const layoutOptions = [
    { value: 'option1', label: 'Balanced Two-Column', description: 'Mobile: Stacked | Desktop: 60/40 split' },
    { value: 'option2', label: 'Three-Column Grid', description: 'Mobile: Stacked | Tablet: 2 cols | Desktop: 3 cols' },
    { value: 'option3', label: 'Vertical Stack', description: 'Mobile-first - Always stacked, max-width' },
    { value: 'option4', label: 'Side-by-Side Equal', description: 'Mobile: Stacked | Desktop: 50/50 split' },
    { value: 'option5', label: 'Wide Form Layout', description: 'Mobile: Stacked | Desktop: Form 70%' },
    { value: 'option6', label: 'Compact Dashboard', description: 'Mobile: Stacked | Tablet: 2 cols | Desktop: 3 cols' },
    { value: 'option7', label: 'Single Column', description: 'Mobile-first - Full width, always stacked' },
    { value: 'option8', label: 'Asymmetric Focus', description: 'Mobile: Stacked | Desktop: Large form focus' },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDropdown]);

  // Reusable Positions Card Component - Improved Responsive
  const PositionsCard = () => (
    <div className="bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-lg sm:rounded-xl md:rounded-2xl lg:rounded-[24px] p-3 sm:p-4 md:p-5 lg:p-6 shadow-[0_4px_20px_rgba(0,0,0,0.1)] relative overflow-hidden w-full max-w-full">
      {/* Header */}
      <div className="mb-3 sm:mb-4 md:mb-5 lg:mb-6">
        <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold m-0 mb-1 sm:mb-1.5 md:mb-2 sh-dex-title">
          Your Liquidity Positions
        </h1>
        <p className="text-[10px] sm:text-xs md:text-sm text-white/60 m-0 leading-4 sm:leading-5 md:leading-6">
          Manage your liquidity positions and track earnings
        </p>
      </div>

      {/* Stats Overview - Better responsive grid */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 md:gap-3 lg:gap-4 mb-3 sm:mb-4 md:mb-5 lg:mb-6">
        <div className="p-2 sm:p-2.5 md:p-3 lg:p-4 rounded-md sm:rounded-lg md:rounded-xl lg:rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-[10px]">
          <div className="text-[8px] sm:text-[9px] md:text-[10px] lg:text-xs text-white/60 mb-0.5 sm:mb-1 font-medium uppercase tracking-wider truncate">
            Positions
          </div>
          <div className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-white break-words">
            {positions.length}
          </div>
        </div>
        <div className="p-2 sm:p-2.5 md:p-3 lg:p-4 rounded-md sm:rounded-lg md:rounded-xl lg:rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-[10px]">
          <div className="text-[8px] sm:text-[9px] md:text-[10px] lg:text-xs text-white/60 mb-0.5 sm:mb-1 font-medium uppercase tracking-wider truncate">
            Total Value
          </div>
          <div className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-green-400 break-words">
            ${positions.reduce((sum, pos) => sum + (Number(pos.valueUsd) || 0), 0).toLocaleString()}
          </div>
        </div>
        <div className="p-2 sm:p-2.5 md:p-3 lg:p-4 rounded-md sm:rounded-lg md:rounded-xl lg:rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-[10px]">
          <div className="text-[8px] sm:text-[9px] md:text-[10px] lg:text-xs text-white/60 mb-0.5 sm:mb-1 font-medium uppercase tracking-wider truncate">
            Fees Earned
          </div>
          <div className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-[#4ecdc4] break-words">
            $0.00
          </div>
        </div>
      </div>

      {/* Positions List - Improved Responsive */}
      <div className="mb-0">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2 sm:mb-3 md:mb-4">
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
            <h3 className="text-xs sm:text-sm md:text-base font-semibold text-white m-0">
              Active Positions
            </h3>
            {loading && positions.length > 0 && (
              <Spinner className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4" />
            )}
          </div>
          <div className="flex gap-1.5 sm:gap-2">
            {activeAccount && (
              <button
                onClick={() => refreshPositions()}
                disabled={loading}
                className={`px-2.5 sm:px-3 md:px-4 py-1 sm:py-1.5 md:py-2 rounded-md sm:rounded-lg md:rounded-xl border border-white/10 bg-white/[0.02] text-white cursor-pointer text-[9px] sm:text-[10px] md:text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] backdrop-blur-[10px] flex items-center gap-1 sm:gap-1.5 md:gap-2 ${loading
                  ? 'cursor-not-allowed opacity-60'
                  : 'hover:bg-[#4ecdc4] hover:-translate-y-0.5 active:translate-y-0'
                  }`}
              >
                {loading ? (
                  <>
                    <Spinner className="w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3" />
                    <span className="hidden sm:inline">Refreshing...</span>
                  </>
                ) : (
                  <>🔄 <span className="hidden sm:inline">Refresh</span></>
                )}
              </button>
            )}
          </div>
        </div>

        {loading && positions.length === 0 ? (
          <div className="text-center py-4 sm:py-6 md:py-8 lg:py-10 text-white/60 flex flex-col items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-4">
            <Spinner className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 lg:w-8 lg:h-8" />
            <span className="text-[10px] sm:text-xs md:text-sm lg:text-base">Loading your positions...</span>
          </div>
        ) : error ? (
          <div className="text-center p-2.5 sm:p-3 md:p-4 lg:p-5 text-red-400 bg-red-400/10 rounded-md sm:rounded-lg md:rounded-xl lg:rounded-2xl border border-red-400/20 backdrop-blur-[10px] text-[10px] sm:text-xs md:text-sm">
            {error}
          </div>
        ) : positions.length === 0 ? (
          <div className="text-center p-3 sm:p-4 md:p-6 lg:p-10 bg-white/[0.03] rounded-md sm:rounded-lg md:rounded-xl lg:rounded-2xl border border-white/10 backdrop-blur-[10px]">
            <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl mb-1.5 sm:mb-2 md:mb-3 lg:mb-4 opacity-30">
              💧
            </div>
            <div className="text-[10px] sm:text-xs md:text-sm lg:text-base font-semibold mb-1 sm:mb-1.5 md:mb-2 text-white">
              No liquidity positions found
            </div>
            <div className="text-[9px] sm:text-[10px] md:text-xs lg:text-sm text-white/60 mb-2 sm:mb-3 md:mb-4 lg:mb-5 leading-relaxed px-2">
              Start earning fees by providing liquidity to trading pairs
            </div>
            {!activeAccount && (
              <ConnectWalletButton
                label="CONNECT WALLET"
                variant="dex"
                className="px-3 sm:px-4 md:px-5 lg:px-6 py-1.5 sm:py-2 md:py-2.5 lg:py-3 rounded-md sm:rounded-lg md:rounded-xl border-none bg-[#1161FE] text-white text-[9px] sm:text-[10px] md:text-xs lg:text-sm font-semibold shadow-[0_8px_25px_rgba(17,97,254,0.4)] cursor-pointer hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5 sm:gap-2 md:gap-3 max-h-[250px] sm:max-h-[300px] md:max-h-[400px] lg:max-h-[500px] overflow-y-auto pr-0.5 sm:pr-1">
            {positions.filter(position => position?.pair?.address).map((position, index) => (
              <LiquidityPositionCard
                key={`${position?.pair?.address}-${index}`}
                position={position}
                onRemove={(position) => {
                  selectPositionForRemove(position);
                  handleFormSelect();
                }}
                onAdd={(position) => {
                  selectPositionForAdd(position);
                  handleFormSelect();
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-full pb-4 md:pb-6 overflow-x-hidden">
      {/* Fixed Layout Switcher - Top Right Corner */}
      {showSwitcher && (
        <div className="fixed top-4 right-4 z-[9999]" ref={dropdownRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDropdown(!showDropdown);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors cursor-pointer text-xs font-semibold text-yellow-400 shadow-lg backdrop-blur-sm"
            title="Layout Switcher (Temporary)"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Layout</span>
          </button>
          {showDropdown && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-gray-900/95 border border-white/20 rounded-lg shadow-2xl backdrop-blur-md z-[10000] max-h-[80vh] overflow-y-auto">
              <div className="p-3">
                <div className="text-[10px] font-semibold text-yellow-400 mb-3 px-2 uppercase tracking-wider">
                  Layout Options (Temp)
                </div>
                <div className="space-y-1.5">
                  {layoutOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setLayoutOption(option.value as LayoutOption);
                        setShowDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-xs transition-colors ${
                        layoutOption === option.value
                          ? 'bg-blue-500/20 border border-blue-500/40 text-blue-300'
                          : 'hover:bg-white/5 text-white/80 border border-transparent'
                      }`}
                    >
                      <div className="font-semibold mb-0.5">{option.label}</div>
                      <div className="text-[10px] text-white/50 leading-tight">{option.description}</div>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setShowSwitcher(false);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-1.5 mt-3 pt-2 border-t border-white/10 rounded-md text-[10px] text-white/60 hover:bg-white/5 border-transparent"
                >
                  Hide Switcher
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Show Switcher Button (when hidden) */}
      {!showSwitcher && (
        <button
          onClick={() => setShowSwitcher(true)}
          className="fixed top-4 right-4 z-[9999] px-3 py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors cursor-pointer text-xs font-semibold text-yellow-400 shadow-lg backdrop-blur-sm"
          title="Show Layout Switcher"
        >
          <LayoutGrid className="w-4 h-4" />
        </button>
      )}

      {/* Header */}
      <div className="mb-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <Droplets className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-normal sm:tracking-normal" style={{ background: 'none', backgroundImage: 'none', WebkitBackgroundClip: 'unset', WebkitTextFillColor: 'unset', letterSpacing: 'normal' }}>Pool</h1>
              <p className="text-xs text-white/60">Provide liquidity and earn fees</p>
            </div>
          </div>
          <div className="flex items-center h-[52px] justify-end">
            <button
              onClick={() => navigate('/apps')}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors cursor-pointer text-xs font-semibold text-white/80 hover:text-white"
              aria-label="More mini apps"
            >
              More mini apps
            </button>
          </div>
        </div>
      </div>
      {/* Main Content - wrapped in card */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl w-full max-w-full" style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)' }}>
        {/* Browser Window Header */}
        <div 
          className="flex items-center justify-between border-b border-white/10 px-3 py-2"
          style={{ 
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="text-[10px] font-semibold text-white/60 uppercase tracking-wider">MINI APP</div>
          <button
            onClick={() => navigate('/apps')}
            className="w-5 h-5 rounded hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-3 h-3 text-white/60" />
          </button>
        </div>
        <div className="p-3 sm:p-4 md:p-5 lg:p-6 xl:p-8 w-full max-w-full overflow-x-hidden">
          {/* OPTION 1: Balanced Two-Column Layout - Auto-fit with minmax, wraps when needed */}
          {layoutOption === 'option1' && (
            <div className="grid gap-3 sm:gap-4 md:gap-5 lg:gap-6 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))' }}>
              <div className="min-w-0 w-full">
                <div id="liquidity-forms-section" className="lg:sticky lg:top-5 flex flex-col gap-4 sm:gap-5 md:gap-6">
                  {currentAction === 'remove' ? (
                    <RemoveLiquidityForm />
                  ) : (
                    <AddLiquidityForm />
                  )}
                </div>
              </div>
              <div className="min-w-0 w-full flex flex-col gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                <PositionsCard />
                <div className="lg:sticky lg:top-5">
                  <RecentActivity />
                </div>
              </div>
            </div>
          )}

          {/* OPTION 2: Three-Column Grid Layout - Auto-fit with minmax */}
          {layoutOption === 'option2' && (
            <div className="grid gap-3 sm:gap-4 md:gap-5 lg:gap-6 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' }}>
              <div className="min-w-0 w-full">
                <div id="liquidity-forms-section" className="xl:sticky xl:top-5 flex flex-col gap-4 sm:gap-5 md:gap-6">
                  {currentAction === 'remove' ? (
                    <RemoveLiquidityForm />
                  ) : (
                    <AddLiquidityForm />
                  )}
                </div>
              </div>
              <div className="min-w-0 w-full">
                <PositionsCard />
              </div>
              <div className="min-w-0 w-full">
                <div className="xl:sticky xl:top-5">
                  <RecentActivity />
                </div>
              </div>
            </div>
          )}

          {/* OPTION 3: Vertical Stack Layout - Always stacked */}
          {layoutOption === 'option3' && (
            <div className="flex flex-col gap-3 sm:gap-4 md:gap-5 lg:gap-6 w-full max-w-full sm:max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto">
              <div className="min-w-0 w-full">
                <div id="liquidity-forms-section" className="flex flex-col gap-4 sm:gap-5 md:gap-6">
                  {currentAction === 'remove' ? (
                    <RemoveLiquidityForm />
                  ) : (
                    <AddLiquidityForm />
                  )}
                </div>
              </div>
              <div className="grid gap-3 sm:gap-4 md:gap-5 lg:gap-6 w-full" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' }}>
                <div className="min-w-0 w-full">
                  <PositionsCard />
                </div>
                <div className="min-w-0 w-full">
                  <RecentActivity />
                </div>
              </div>
            </div>
          )}

          {/* OPTION 4: Side-by-Side Equal Cards - Auto-fit with minmax */}
          {layoutOption === 'option4' && (
            <div className="grid gap-3 sm:gap-4 md:gap-5 lg:gap-6 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))' }}>
              <div className="min-w-0 w-full">
                <div id="liquidity-forms-section" className="lg:sticky lg:top-5 flex flex-col gap-4 sm:gap-5 md:gap-6">
                  {currentAction === 'remove' ? (
                    <RemoveLiquidityForm />
                  ) : (
                    <AddLiquidityForm />
                  )}
                </div>
              </div>
              <div className="min-w-0 w-full flex flex-col gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                <PositionsCard />
                <RecentActivity />
              </div>
            </div>
          )}

          {/* OPTION 5: Wide Form Layout - Auto-fit with minmax */}
          {layoutOption === 'option5' && (
            <div className="grid gap-3 sm:gap-4 md:gap-5 lg:gap-6 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 450px), 2fr)) minmax(min(100%, 280px), 1fr)' }}>
              <div className="min-w-0 w-full">
                <div id="liquidity-forms-section" className="lg:sticky lg:top-5 flex flex-col gap-4 sm:gap-5 md:gap-6">
                  {currentAction === 'remove' ? (
                    <RemoveLiquidityForm />
                  ) : (
                    <AddLiquidityForm />
                  )}
                </div>
              </div>
              <div className="min-w-0 w-full flex flex-col gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                <PositionsCard />
                <div className="lg:sticky lg:top-5">
                  <RecentActivity />
                </div>
              </div>
            </div>
          )}

          {/* OPTION 6: Compact Dashboard - Auto-fit with minmax */}
          {layoutOption === 'option6' && (
            <div className="grid gap-3 sm:gap-4 md:gap-5 lg:gap-6 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' }}>
              <div className="min-w-0 w-full">
                <div id="liquidity-forms-section" className="flex flex-col gap-4 sm:gap-5 md:gap-6">
                  {currentAction === 'remove' ? (
                    <RemoveLiquidityForm />
                  ) : (
                    <AddLiquidityForm />
                  )}
                </div>
              </div>
              <div className="min-w-0 w-full">
                <PositionsCard />
              </div>
              <div className="min-w-0 w-full">
                <RecentActivity />
              </div>
            </div>
          )}

          {/* OPTION 7: Single Column - Always stacked */}
          {layoutOption === 'option7' && (
            <div className="flex flex-col gap-3 sm:gap-4 md:gap-5 lg:gap-6 w-full max-w-full">
              <div className="min-w-0 w-full">
                <div id="liquidity-forms-section" className="flex flex-col gap-4 sm:gap-5 md:gap-6">
                  {currentAction === 'remove' ? (
                    <RemoveLiquidityForm />
                  ) : (
                    <AddLiquidityForm />
                  )}
                </div>
              </div>
              <div className="min-w-0 w-full">
                <PositionsCard />
              </div>
              <div className="min-w-0 w-full">
                <RecentActivity />
              </div>
            </div>
          )}

          {/* OPTION 8: Asymmetric Focus - Auto-fit with minmax */}
          {layoutOption === 'option8' && (
            <div className="grid gap-3 sm:gap-4 md:gap-5 lg:gap-6 items-start" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 500px), 3fr)) minmax(min(100%, 250px), 1fr)' }}>
              <div className="min-w-0 w-full">
                <div id="liquidity-forms-section" className="lg:sticky lg:top-5 flex flex-col gap-4 sm:gap-5 md:gap-6">
                  {currentAction === 'remove' ? (
                    <RemoveLiquidityForm />
                  ) : (
                    <AddLiquidityForm />
                  )}
                </div>
              </div>
              <div className="min-w-0 w-full flex flex-col gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                <PositionsCard />
                <div className="lg:sticky lg:top-5">
                  <RecentActivity />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Pool() {
  return (
    <PoolProvider>
      <PoolContent />
    </PoolProvider>
  );
}
