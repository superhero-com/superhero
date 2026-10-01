import {
  ArrowDown, ArrowUp, ChevronRight, Hash,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import { useIsMobile } from '@/hooks';
import { usePointerHighlight } from '@/hooks/usePointerHighlight';
import { isNonEnglishToken, tokenCollectionLabel } from '@/utils/collection';
import {
  MarketAmount, MarketChange, MarketHistory, MarketPrice, marketVolume, tokenMarketHref,
} from './ExploreMarketValues';

export type MarketOrderBy = 'market_cap' | 'newest' | 'oldest' | 'holders_count' | 'trending_score' | 'name' | 'price';

const MarketRow = ({ token, rank }: { token: TokenDto; rank: number }) => {
  const { t } = useTranslation('trending');
  const highlight = usePointerHighlight();
  const navigate = useNavigate();
  const href = tokenMarketHref(token);
  const label = token.symbol || token.name || token.address;
  const open = (event: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) => {
    if (event.metaKey || event.ctrlKey) window.open(href, '_blank', 'noopener');
    else if (event.shiftKey) window.open(href);
    else navigate(href);
  };
  return (
    <tr
      className="market-row"
      tabIndex={0}
      role="link"
      aria-label={t('common:aria.viewToken', { token: label })}
      onClick={(event) => {
        if (!(event.target as HTMLElement).closest('a, button')) open(event);
      }}
      onAuxClick={(event) => {
        if (event.button === 1 && !(event.target as HTMLElement).closest('a, button')) {
          event.preventDefault();
          window.open(href, '_blank', 'noopener');
        }
      }}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          open(event);
        }
      }}
      {...highlight}
    >
      <td className="market-rank">{rank}</td>
      <td className="market-name">
        <div className="market-identity">
          <span className="market-identity__mark" aria-hidden="true"><Hash /></span>
          <div className="market-identity__copy">
            <Link to={href} tabIndex={-1}><strong><bdi>{label}</bdi></strong></Link>
            {token.name && token.symbol && token.name !== token.symbol && (
              <span className="market-collection">{token.name}</span>
            )}
            {isNonEnglishToken(token) && (
              <span className="market-collection">{tokenCollectionLabel(token)}</span>
            )}
          </div>
        </div>
        <div className="market-mobile-cap">
          <span>{t('market.capShort')}</span>
          <MarketAmount value={token.market_cap_data?.ae} aettos unit="AE" />
        </div>
      </td>
      <td className="market-price">
        <MarketPrice token={token} />
        <div className="market-mobile-change">
          <MarketChange period={token.performance?.past_30d} />
          <small>{t('tokenListTable.change30d')}</small>
        </div>
      </td>
      <td className="market-day"><MarketChange period={token.performance?.past_24h} /></td>
      <td className="market-week"><MarketChange period={token.performance?.past_7d} /></td>
      <td className="market-month"><MarketChange period={token.performance?.past_30d} /></td>
      <td className="market-cap"><MarketAmount value={token.market_cap_data?.ae} aettos /></td>
      <td className="market-volume"><MarketAmount value={marketVolume(token)} /></td>
      <td className="market-supply"><MarketAmount value={token.total_supply} aettos /></td>
      <td className="market-chart">
        <MarketHistory token={token} />
        <small className="market-chart__label">{t('tokenListTable.allTime')}</small>
      </td>
      <td className="market-open" aria-hidden="true"><ChevronRight /></td>
    </tr>
  );
};

interface ExploreTokenTableProps {
  items: TokenDto[];
  loading?: boolean;
  rankOffset: number;
  orderBy: MarketOrderBy;
  orderDirection: 'ASC' | 'DESC';
  onSort: (sort: MarketOrderBy) => void;
}

const ExploreTokenTable = ({
  items, loading, rankOffset, orderBy, orderDirection, onSort,
}: ExploreTokenTableProps) => {
  const { t } = useTranslation('trending');
  const mobile = useIsMobile();
  const header = (label: string, sort: MarketOrderBy, unit?: string) => (
    <button type="button" aria-label={unit ? `${label} ${unit}` : label} onClick={() => onSort(sort)}>
      <span>
        {label}
        {unit && <small>{unit}</small>}
      </span>
      {orderBy === sort && (orderDirection === 'DESC' ? <ArrowDown /> : <ArrowUp />)}
    </button>
  );
  const ariaSort = (key: MarketOrderBy) => {
    if (orderBy !== key) return 'none';
    return orderDirection === 'ASC' ? 'ascending' : 'descending';
  };
  return (
    <div className="market-table-shell" data-mobile={mobile} aria-busy={loading}>
      <table className="market-table" aria-label={t('market.markets')}>
        <thead>
          <tr>
            <th className="market-rank" title={t('common:titles.clickToReverseRankingOrder')}>
              {header('#', orderBy)}
            </th>
            <th className="market-name" aria-sort={ariaSort('name')}>
              {header(t('tokenListTable.name'), 'name')}
            </th>
            <th className="market-price" aria-sort={ariaSort('price')}>
              {header(t('tokenListTable.price'), 'price', 'AE')}
            </th>
            <th className="market-day">{t('tokenListTable.change24h')}</th>
            <th className="market-week">{t('tokenListTable.change7d')}</th>
            <th className="market-month">{t('tokenListTable.change30d')}</th>
            <th className="market-cap" aria-sort={ariaSort('market_cap')}>
              {header(t('tokenListTable.marketCap'), 'market_cap', 'AE')}
            </th>
            <th className="market-volume">{t('tokenListTable.volume30d')}</th>
            <th className="market-supply">{t('market.supply')}</th>
            <th className="market-chart">{t('tokenListTable.allTime')}</th>
            <th className="market-open" aria-label={t('market.details')} />
          </tr>
        </thead>
        <tbody>
          {loading && !items.length ? Array.from({ length: 12 }, (_, index) => (
            <tr className="market-skeleton" key={`loading-${index + 1}`} aria-hidden="true">
              {['rank', 'name', 'price', 'day', 'week', 'month', 'cap', 'volume', 'supply', 'chart', 'open']
                .map((cell) => <td key={cell} className={`market-${cell}`} aria-label={t('tokenList.loading')}><span /></td>)}
            </tr>
          )) : items.map((token, index) => (
            <MarketRow key={token.address} token={token} rank={rankOffset + index + 1} />
          ))}
        </tbody>
      </table>
      {loading && !items.length && <span className="sr-only" role="status">{t('tokenList.loading')}</span>}
    </div>
  );
};

export default ExploreTokenTable;
