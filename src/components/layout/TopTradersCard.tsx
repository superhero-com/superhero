import { useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AddressAvatar from '@/components/AddressAvatar';
import { fetchLeaderboard, type LeaderboardItem } from '@/features/trending/api/leaderboard';
import { useChainName } from '@/hooks/useChainName';
import './RailCards.css';

const pnlFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
  signDisplay: 'exceptZero',
});

const TraderRow = ({ item, rank }: { item: LeaderboardItem; rank: number }) => {
  const apiName = item.chain_name?.trim();
  const { chainName } = useChainName(item.address, { lookup: !apiName });
  const name = apiName || chainName || item.address;
  const pnl = item.pnl_usd == null ? NaN : Number(item.pnl_usd);
  let pnlTone = 'neutral';
  if (Number.isFinite(pnl) && pnl > 0) pnlTone = 'positive';
  if (Number.isFinite(pnl) && pnl < 0) pnlTone = 'negative';

  return (
    <li>
      <Link to={`/users/${encodeURIComponent(item.address)}`} className="rail-trader">
        <span className="rail-trader__rank">{rank}</span>
        <AddressAvatar address={item.address} size={28} />
        <span className="rail-trader__name" dir="auto">{name}</span>
        <span className={`rail-trader__pnl rail-trader__pnl--${pnlTone}`} dir="ltr">
          {Number.isFinite(pnl) ? pnlFormatter.format(pnl) : '—'}
        </span>
      </Link>
    </li>
  );
};

const TopTradersCard = () => {
  const { t } = useTranslation('common');
  const headingId = useId();
  const {
    data, isPending, isError, isFetching, refetch,
  } = useQuery({
    queryKey: ['leaderboard', 'all', 'pnl', 1, 3, undefined, undefined],
    queryFn: () => fetchLeaderboard({
      timeframe: 'all', metric: 'pnl', page: 1, limit: 3, sortDir: 'DESC',
    }),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
  });
  const traders = data?.items.slice(0, 3) ?? [];

  return (
    <section className="rail-card top-traders-card" aria-labelledby={headingId}>
      <div className="rail-card__header">
        <span className="rail-badge" aria-hidden="true"><Trophy /></span>
        <div className="rail-card__title">
          <h4 id={headingId}>{t('rightRail.topTraders')}</h4>
          <span>{t('rightRail.allTimePnl')}</span>
        </div>
        <span className="rail-card__header-line" aria-hidden="true" />
      </div>
      {isPending && (
        <div className="top-traders-card__loading" role="status" aria-label={t('rightRail.loadingTraders')}>
          {[1, 2, 3].map((rank) => (
            <div key={rank} className="rail-trader-skeleton" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          ))}
        </div>
      )}
      {!isPending && isError && traders.length === 0 && (
        <div className="top-traders-card__message" role="status">
          <span>{t('trending:unableToLoadLeaderboard')}</span>
          <button type="button" onClick={() => refetch()} disabled={isFetching}>
            {t('trending:retry')}
          </button>
        </div>
      )}
      {!isPending && !isError && traders.length === 0 && (
        <p className="top-traders-card__message">{t('trending:noTopTraders')}</p>
      )}
      {traders.length > 0 && (
        <ol className="top-traders-card__list">
          {traders.map((item, index) => (
            <TraderRow key={item.address} item={item} rank={index + 1} />
          ))}
        </ol>
      )}
      <Link to="/trends/leaderboard" className="rail-card__cta">
        <span>{t('rightRail.viewLeaderboard')}</span>
        <ArrowUpRight aria-hidden="true" />
      </Link>
    </section>
  );
};

export default TopTradersCard;
