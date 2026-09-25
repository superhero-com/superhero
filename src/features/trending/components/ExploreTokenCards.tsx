import { ArrowUpRight, Hash } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import { usePointerHighlight } from '@/hooks/usePointerHighlight';
import { tokenCollectionLabel } from '@/utils/collection';
import {
  MarketAmount, MarketChange, MarketHistory, MarketPrice, marketVolume, tokenMarketHref,
} from './ExploreMarketValues';

const ExploreTokenCard = ({ token, rank }: { token: TokenDto; rank: number }) => {
  const { t } = useTranslation('trending');
  const highlight = usePointerHighlight();
  const label = token.symbol || token.name || token.address;
  return (
    <Link
      className="market-card"
      to={tokenMarketHref(token)}
      aria-label={t('common:aria.viewToken', { token: label })}
      {...highlight}
    >
      <div className="market-card__header">
        <span className="market-card__mark" aria-hidden="true"><Hash /></span>
        <div className="market-card__identity">
          <h3><bdi>{label}</bdi></h3>
          {token.name && token.symbol && token.name !== token.symbol && <span>{token.name}</span>}
          <span>{tokenCollectionLabel(token)}</span>
        </div>
        <span className="market-card__rank" aria-label={`${t('market.rank')} ${rank}`}>
          <bdi>
            #
            {rank}
          </bdi>
        </span>
        <ArrowUpRight className="market-card__open" aria-hidden="true" />
      </div>
      <div className="market-card__price">
        <span>{t('tokenListTable.price')}</span>
        <div>
          <MarketPrice token={token} />
          <small>AE</small>
        </div>
      </div>
      <div className="market-card__history">
        <div className="market-card__history-label">
          <span>{t('market.history')}</span>
          <span>{t('tokenListTable.allTime')}</span>
        </div>
        <MarketHistory token={token} large />
      </div>
      <dl className="market-card__changes">
        {(['past_24h', 'past_7d', 'past_30d'] as const).map((period, index) => (
          <div key={period}>
            <dt>{t(`tokenListTable.${['change24h', 'change7d', 'change30d'][index]}`)}</dt>
            <dd><MarketChange period={token.performance?.[period]} /></dd>
          </div>
        ))}
      </dl>
      <dl className="market-card__stats">
        <div>
          <dt>{t('tokenListTable.marketCap')}</dt>
          <dd><MarketAmount value={token.market_cap_data?.ae} aettos unit="AE" /></dd>
        </div>
        <div>
          <dt>{t('tokenListTable.volume30d')}</dt>
          <dd><MarketAmount value={marketVolume(token)} /></dd>
        </div>
        <div>
          <dt>{t('market.supply')}</dt>
          <dd><MarketAmount value={token.total_supply} aettos /></dd>
        </div>
      </dl>
    </Link>
  );
};

const ExploreTokenCards = ({ items, rankOffset, loading }: {
  items: TokenDto[];
  rankOffset: number;
  loading?: boolean;
}) => {
  const { t } = useTranslation('trending');
  return (
    <div className="market-card-grid-shell" aria-busy={loading}>
      <div className="market-card-grid">
        {loading && !items.length ? Array.from({ length: 6 }, (_, index) => (
          <div className="market-card market-card--skeleton" key={`loading-${index + 1}`} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        )) : items.map((token, index) => (
          <ExploreTokenCard key={token.address} token={token} rank={rankOffset + index + 1} />
        ))}
      </div>
      {loading && !items.length && <span className="sr-only" role="status">{t('tokenList.loading')}</span>}
    </div>
  );
};

export default ExploreTokenCards;
