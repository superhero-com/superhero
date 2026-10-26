import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageSpaceHero from '../../../components/hero-banner/PageSpaceHero';
import RecentActivity from '../../../components/dex/supporting/RecentActivity';
import { useAccount } from '../../../hooks';
import { AddLiquidityForm, RemoveLiquidityForm } from '../components';
import { PoolProvider, usePool } from '../context/PoolProvider';
import { useLiquidityPositions } from '../hooks';
import LiquidityPositionsPanel from '../components/LiquidityPositionsPanel';

const PoolContent = () => {
  const { t } = useTranslation('dex');
  const { activeAccount } = useAccount();
  const {
    positions, loading, error, refreshPositions,
  } = useLiquidityPositions();
  const {
    selectPositionForAdd, selectPositionForRemove, selectedPosition, clearSelection, currentAction,
  } = usePool();

  const handleFormSelect = () => {
    // Focus on the forms section
    const formsSection = document.getElementById('liquidity-forms-section');
    if (formsSection) {
      formsSection.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  };

  return (
    <div className="mx-auto md:py-0 flex flex-col gap-6 md:gap-8 min-h-screen">
      <PageSpaceHero
        className="ui-hero px-5 py-5 md:px-8 md:py-7 text-left"
        supernovaColor="rgba(0,229,255,.45)"
      >
        <h1 className="m-0 text-2xl md:text-3xl font-extrabold leading-tight text-white">
          {t('pool.bannerTitle')}
        </h1>
        <p className="mt-2 mb-0 max-w-2xl text-sm md:text-base leading-relaxed text-white/75">
          {t('pool.bannerSubtitle')}
        </p>
        <Link
          to="/defi/explore/pools"
          className="mt-4 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white no-underline hover:bg-white/15"
        >
          {t('pool.bannerCta')}
        </Link>
      </PageSpaceHero>
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
          <LiquidityPositionsPanel
            key={activeAccount || 'disconnected'}
            connected={!!activeAccount}
            positions={positions}
            loading={loading}
            error={error}
            selectedPair={selectedPosition?.pair.address}
            onRefresh={() => { refreshPositions(); }}
            onAdd={(position) => {
              if (position) selectPositionForAdd(position); else clearSelection();
              handleFormSelect();
            }}
            onRemove={(position) => {
              selectPositionForRemove(position);
              handleFormSelect();
            }}
          />
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
