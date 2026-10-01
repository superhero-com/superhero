import {
  ArrowUpRight, ChevronRight, LayoutGrid, List, RefreshCw, Trophy, Users,
} from 'lucide-react';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import AddressAvatar from '@/components/AddressAvatar';
import { usePointerHighlight } from '@/hooks/usePointerHighlight';
import type { LeaderboardItem } from '../api/leaderboard';
import './ExploreUsers.css';

export type UserLayout = 'list' | 'cards';

const money = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 2, minimumFractionDigits: 2,
});
const signedMoney = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: 2, minimumFractionDigits: 2, signDisplay: 'exceptZero',
});
const isKnown = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

function formatMoney(value: number | undefined, signed = false) {
  return isKnown(value) ? (signed ? signedMoney : money).format(value) : '—';
}

function formatRoi(value: number | undefined) {
  if (!isKnown(value)) return '—';
  const sign = value < 0 ? '−' : '+';
  return `${value === 0 ? '' : sign}${Math.abs(value).toFixed(2)}%`;
}

const Trader = ({ item, rank, layout }: {
  item: LeaderboardItem;
  rank: number;
  layout: UserLayout;
}) => {
  const { t } = useTranslation('trending');
  const highlight = usePointerHighlight();
  const name = item.chain_name || item.address;
  let pnlClass = '';
  if (isKnown(item.pnl_usd) && item.pnl_usd > 0) pnlClass = 'is-positive';
  if (isKnown(item.pnl_usd) && item.pnl_usd < 0) pnlClass = 'is-negative';

  return (
    <li>
      <Link
        className={`explore-users-trader ${layout === 'cards' ? 'explore-users-trader--card' : ''}`}
        to={`/users/${item.address}`}
        aria-label={t('users.profile', { name })}
        {...highlight}
      >
        <div className="explore-users-trader__identity">
          <span className="explore-users-trader__avatar">
            <AddressAvatar address={item.address} size={layout === 'cards' ? 48 : 44} />
            <span
              className={`explore-users-trader__rank ${rank === 1 ? 'is-first' : ''}`}
              aria-label={t('users.rank', { rank })}
            >
              {rank === 1 ? <Trophy aria-hidden="true" /> : rank}
            </span>
          </span>
          <div className="explore-users-trader__copy">
            <strong className={item.chain_name ? '' : 'is-address'} dir={item.chain_name ? 'auto' : 'ltr'}>
              {name}
            </strong>
            <span className="explore-users-trader__address" dir="ltr">{item.address}</span>
          </div>
        </div>
        <dl className="explore-users-trader__stats">
          <div className="explore-users-trader__pnl">
            <dt>{t('users.pnl')}</dt>
            <dd className={pnlClass}><bdi>{formatMoney(item.pnl_usd, true)}</bdi></dd>
          </div>
          <div>
            <dt>{t('users.roi')}</dt>
            <dd><bdi>{formatRoi(item.roi_pct)}</bdi></dd>
          </div>
          <div>
            <dt>{t('users.aum')}</dt>
            <dd><bdi>{formatMoney(item.aum_usd)}</bdi></dd>
          </div>
        </dl>
        <ChevronRight className="explore-users-trader__open" aria-hidden="true" />
      </Link>
    </li>
  );
};

const ExploreUsers = ({
  items, layout, onLayoutChange, loading, error, fetching, onRetry,
}: {
  items: LeaderboardItem[];
  layout: UserLayout;
  onLayoutChange: (value: UserLayout) => void;
  loading?: boolean;
  error?: boolean;
  fetching?: boolean;
  onRetry: () => void;
}) => {
  const { t, i18n } = useTranslation('trending');
  const headingId = useId();
  const hasItems = items.length > 0;

  return (
    <section className="explore-users" dir={i18n.dir()} aria-labelledby={headingId}>
      <header className="explore-users-heading">
        <div>
          <h2 id={headingId}>{t('users.title')}</h2>
          <p>{t('users.subtitle')}</p>
        </div>
        <div className="explore-users-heading__actions">
          <div className="explore-users-view-switch" role="group" aria-label={t('users.layout')}>
            {([{ value: 'list', Icon: List }, { value: 'cards', Icon: LayoutGrid }] as const)
              .map(({ value, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={layout === value}
                  aria-label={t(`users.${value}`)}
                  title={t(`users.${value}`)}
                  onClick={() => onLayoutChange(value)}
                >
                  <Icon aria-hidden="true" />
                  <span>{t(`users.${value}`)}</span>
                </button>
              ))}
          </div>
          <Link to="/trends/leaderboard">
            {t('users.leaderboard')}
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </div>
      </header>
      {loading && !hasItems && (
        <div
          className={`explore-users-loading ${layout === 'cards' ? 'explore-users-loading--cards' : ''}`}
          role="status"
          aria-label={t('users.loading')}
        >
          {['a', 'b', 'c', 'd', 'e', 'f'].map((key) => (
            <div key={key} aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
            </div>
          ))}
        </div>
      )}
      {hasItems && (
        <>
          {layout === 'list' && (
            <div className="explore-users-columns" aria-hidden="true">
              <span>{t('users.trader')}</span>
              <div>
                <span>{t('users.pnl')}</span>
                <span>{t('users.roi')}</span>
                <span>{t('users.aum')}</span>
              </div>
              <span />
            </div>
          )}
          <ol className={layout === 'cards' ? 'explore-users-cards' : 'explore-users-list'}>
            {items.map((item, i) => (
              <Trader key={item.address} item={item} rank={i + 1} layout={layout} />
            ))}
          </ol>
        </>
      )}
      {!loading && !hasItems && !error && (
        <div className="explore-users-empty">
          <Users aria-hidden="true" />
          <h3>{t('users.empty')}</h3>
          <p>{t('users.emptyCopy')}</p>
        </div>
      )}
      {error && (!loading || hasItems) && (
        <div className={`explore-users-empty ${hasItems ? 'explore-users-error' : ''}`} role="status">
          <Users aria-hidden="true" />
          <h3>{t(hasItems ? 'users.refreshError' : 'users.error')}</h3>
          <p>{t('users.errorCopy')}</p>
          <button type="button" onClick={onRetry} disabled={fetching}>
            <RefreshCw aria-hidden="true" />
            {t(fetching ? 'users.loading' : 'users.retry')}
          </button>
        </div>
      )}
    </section>
  );
};

export default ExploreUsers;
