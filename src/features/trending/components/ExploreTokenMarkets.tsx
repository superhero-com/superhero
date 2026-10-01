import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import ExploreTokenCards from './ExploreTokenCards';
import ExploreTokenTable, { type MarketOrderBy } from './ExploreTokenTable';
import type { ExploreLayout } from './ExploreViewSwitch';
import './ExploreTokenMarkets.css';

interface ExploreTokenMarketsProps {
  pages?: Array<{ items: TokenDto[] }> | null;
  loading?: boolean;
  layout: ExploreLayout;
  orderBy: MarketOrderBy;
  orderDirection: 'ASC' | 'DESC';
  onSort: (sort: MarketOrderBy) => void;
  rankOffset?: number;
}

const ExploreTokenMarkets = ({
  pages, loading, layout, orderBy, orderDirection, onSort, rankOffset = 0,
}: ExploreTokenMarketsProps) => {
  const { i18n } = useTranslation();
  const items = useMemo(() => pages?.flatMap((page) => page.items) ?? [], [pages]);
  if (!loading && !items.length) return null;
  return (
    <div className="explore-markets" dir={i18n.dir()}>
      {layout === 'cards' ? (
        <ExploreTokenCards items={items} loading={loading} rankOffset={rankOffset} />
      ) : (
        <ExploreTokenTable
          items={items}
          loading={loading}
          rankOffset={rankOffset}
          orderBy={orderBy}
          orderDirection={orderDirection}
          onSort={onSort}
        />
      )}
    </div>
  );
};

export default ExploreTokenMarkets;
