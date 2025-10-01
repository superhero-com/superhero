import { useNavigate } from 'react-router-dom';
import ConnectWalletButton from '../../../components/ConnectWalletButton';
import RecentActivity from '../../../components/dex/supporting/RecentActivity';
import { useAccount } from '../../../hooks';
import { AddLiquidityForm, LiquidityPositionCard, RemoveLiquidityForm } from '../components';
import { PoolProvider, usePool } from '../context/PoolProvider';
import { useLiquidityPositions } from '../hooks';

function PoolContent() {
  const navigate = useNavigate();
  const { activeAccount } = useAccount();
  const { positions, loading, error, refreshPositions } = useLiquidityPositions();
  const { selectPositionForAdd, selectPositionForRemove, currentAction } = usePool();

  const handleFormSelect = () => {
    // Focus on the forms section
    const formsSection = document.getElementById('liquidity-forms-section');
    if (formsSection) {
      formsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="mx-auto md:py-0 flex flex-col gap-6 md:gap-8 min-h-screen">
      {/* Top Row - Forms and Positions */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_480px] gap-6 md:gap-8 items-start">
        {/* Mobile: Forms First, Desktop: Forms First (swapped) */}
        <div className="lg:order-1 order-1">
          {/* Right Column - Liquidity Forms */}
          <div id="liquidity-forms-section" className="lg:sticky lg:top-5 flex flex-col gap-6">
            {currentAction === 'remove' ? (
              <RemoveLiquidityForm />
            ) : (
              <AddLiquidityForm />
            )}
          </div>
        </div>

        {/* Mobile: Positions Second, Desktop: Positions Second */}
        <div className="lg:order-2 order-2">
          <div className="bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.1)] relative overflow-hidden">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-[28px] font-bold m-0 mb-2 sh-dex-title">
                Your Liquidity Positions
              </h1>
              <p className="text-sm text-white/60 m-0 leading-6">
                Manage your liquidity positions and track earnings
              </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-[10px]">
                <div className="text-xs text-white/60 mb-1 font-medium uppercase tracking-wider">
                  Positions
                </div>
                <div className="text-xl font-bold text-white">
                  {positions.length}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-[10px]">
                <div className="text-xs text-white/60 mb-1 font-medium uppercase tracking-wider">
                  Total Value
                </div>
                <div className="text-xl font-bold text-green-400">
                  ${positions.reduce((sum, pos) => sum + (Number(pos.valueUsd) || 0), 0).toLocaleString()}
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10 backdrop-blur-[10px]">
                <div className="text-xs text-white/60 mb-1 font-medium uppercase tracking-wider">
                  Fees Earned
                </div>
                <div className="text-xl font-bold text-[#4ecdc4]">
                  $0.00
                </div>
              </div>
            </div>

            {/* Positions List */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-semibold text-white m-0">
                    Active Positions
                  </h3>
                  {loading && positions.length > 0 && (
                    <div className="w-4 h-4 border-2 border-white/10 border-t-[#4ecdc4] rounded-full animate-spin"></div>
                  )}
                </div>
                <div className="flex gap-2">
                  {activeAccount && (
                    <button
                      onClick={() => refreshPositions()}
                      disabled={loading}
                      className={`px-4 py-2 rounded-xl border border-white/10 bg-white/[0.02] text-white cursor-pointer text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] backdrop-blur-[10px] flex items-center gap-2 ${loading
                        ? 'cursor-not-allowed opacity-60'
                        : 'hover:bg-[#4ecdc4] hover:-translate-y-0.5 active:translate-y-0'
                        }`}
                    >
                      {loading ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Refreshing...
                        </>
                      ) : (
                        <>🔄 Refresh</>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {loading && positions.length === 0 ? (
                <div className="text-center py-10 text-white/60 flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-3 border-white/10 border-t-[#4ecdc4] rounded-full animate-spin"></div>
                  Loading your positions...
                </div>
              ) : error ? (
                <div className="text-center p-5 text-red-400 bg-red-400/10 rounded-2xl border border-red-400/20 backdrop-blur-[10px]">
                  {error}
                </div>
              ) : positions.length === 0 ? (
                <div className="text-center p-10 bg-white/[0.03] rounded-2xl border border-white/10 backdrop-blur-[10px]">
                  <div className="text-5xl mb-4 opacity-30">
                    💧
                  </div>
                  <div className="text-base font-semibold mb-2 text-white">
                    No liquidity positions found
                  </div>
                  <div className="text-sm text-white/60 mb-5 leading-relaxed">
                    Start earning fees by providing liquidity to trading pairs
                  </div>
                  {!activeAccount && (
                    <ConnectWalletButton
                      label="Connect wallet"
                      variant="dex"
                      className="px-6 py-3 rounded-xl border-none bg-[#1161FE] text-white text-sm font-semibold shadow-[0_8px_25px_rgba(17,97,254,0.4)] cursor-pointer hover:shadow-[0_12px_35px_rgba(17,97,254,0.5)] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                    />
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
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
          {/* Recent Activity under Your Liquidity Positions */}
          <div className="mt-6">
            <RecentActivity />
          </div>
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
