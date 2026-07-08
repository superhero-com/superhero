import { useTranslation } from 'react-i18next';
import { ConnectWalletButton } from '../../../components/ConnectWalletButton';
import RecentActivity from '../../../components/dex/supporting/RecentActivity';
import { useAccount } from '../../../hooks';
import { AddLiquidityForm, LiquidityPositionCard, RemoveLiquidityForm } from '../components';
import { PoolProvider, usePool } from '../context/PoolProvider';
import { useLiquidityPositions } from '../hooks';
import Spinner from '../../../components/Spinner';

const PoolContent = () => {
  const { t } = useTranslation();
  const { activeAccount } = useAccount();
  const {
    positions, loading, error, refreshPositions,
  } = useLiquidityPositions();
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
      <div className="grid grid-cols-1 min-[1360px]:grid-cols-[480px_minmax(560px,1fr)] gap-6 md:gap-8 items-start">
        {/* Mobile: Forms First, Desktop: Forms First (left column) */}
        <div className="min-[1360px]:order-1 order-1">
          {/* Liquidity Forms */}
          <div id="liquidity-forms-section" className="min-[1360px]:sticky min-[1360px]:top-5 flex flex-col gap-6">
            {currentAction === 'remove' ? (
              <RemoveLiquidityForm />
            ) : (
              <AddLiquidityForm />
            )}
          </div>
        </div>

        {/* Mobile: Positions Second, Desktop: Positions Second (right column) */}
        <div className="min-[1360px]:order-2 order-2">
          <div className="liquid-glass liquid-glass--strong rounded-xl p-6 relative overflow-hidden">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-[28px] font-bold m-0 mb-2">
                {t('dex.pool.yourLiquidityPositions')}
              </h1>
              <p className="text-sm text-white/60 m-0 leading-6">
                {t('dex.pool.manageDescription')}
              </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 liquid-glass rounded-xl">
                <div className="text-xs text-white/60 mb-1 font-medium uppercase tracking-wider">
                  {t('dex.pool.positions')}
                </div>
                <div className="text-xl font-bold text-white">
                  {positions.length}
                </div>
              </div>
              <div className="p-4 liquid-glass rounded-xl">
                <div className="text-xs text-white/60 mb-1 font-medium uppercase tracking-wider">
                  {t('common.account.totalValue')}
                </div>
                <div className="text-xl font-bold text-bull">
                  $
                  {positions.reduce((sum, pos) => sum + (Number(pos.valueUsd) || 0), 0).toLocaleString()}
                </div>
              </div>
              <div className="p-4 liquid-glass rounded-xl">
                <div className="text-xs text-white/60 mb-1 font-medium uppercase tracking-wider">
                  {t('dex.pool.feesEarned')}
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
                    {t('dex.pool.activePositions')}
                  </h3>
                  {loading && positions.length > 0 && (
                    <Spinner className="w-4 h-4" />
                  )}
                </div>
                <div className="flex gap-2">
                  {activeAccount && (
                    <button
                      type="button"
                      onClick={() => refreshPositions()}
                      disabled={loading}
                      className={`px-4 py-2 rounded-xl border border-white/10 bg-white/[0.02] text-white cursor-pointer text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] backdrop-blur-[10px] flex items-center gap-2 ${loading
                        ? 'cursor-not-allowed opacity-60'
                        : 'hover:bg-[#4ecdc4] hover:-translate-y-0.5 active:translate-y-0'
                      }`}
                    >
                      {loading ? (
                        <>
                          <Spinner className="w-3 h-3" />
                          {t('dex.pool.refreshing')}
                        </>
                      ) : (
                        <>
                          🔄
                          {t('dex.pool.refresh')}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {(() => {
                if (loading && positions.length === 0) {
                  return (
                    <div className="text-center py-10 text-white/60 flex flex-col items-center gap-4">
                      <Spinner className="w-8 h-8" />
                      {t('dex.pool.loadingPositions')}
                    </div>
                  );
                }

                if (error) {
                  return (
                    <div className="text-center p-5 text-red-400 bg-red-400/10 rounded-xl border border-red-400/20 backdrop-blur-[10px]">
                      {error}
                    </div>
                  );
                }

                if (positions.length === 0) {
                  return (
                    <div className="text-center p-10 liquid-glass rounded-xl">
                      <div className="text-5xl mb-4 opacity-30">
                        💧
                      </div>
                      <div className="text-base font-semibold mb-2 text-white">
                        {t('dex.pool.noPositionsFound')}
                      </div>
                      <div className="text-sm text-white/60 mb-5 leading-relaxed">
                        {t('dex.pool.noPositionsHint')}
                      </div>
                      {!activeAccount && (
                        <ConnectWalletButton
                          label={t('dex.swap.connectWallet')}
                          variant="dex"
                          className="px-6 py-3 rounded-xl border-none bg-[#1161FE] text-white text-sm font-semibold shadow-[0_8px_25px_rgba(17,97,254,0.4)] cursor-pointer hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                        />
                      )}
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col gap-3">
                    {positions.filter((item) => item?.pair?.address).map((item) => (
                      <LiquidityPositionCard
                        key={item?.pair?.address}
                        position={item}
                        onRemove={(selectedPosition) => {
                          selectPositionForRemove(selectedPosition);
                          handleFormSelect();
                        }}
                        onAdd={(selectedPosition) => {
                          selectPositionForAdd(selectedPosition);
                          handleFormSelect();
                        }}
                      />
                    ))}
                  </div>
                );
              })()}
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
};

const Pool = () => (
  <PoolProvider>
    <PoolContent />
  </PoolProvider>
);

export default Pool;
