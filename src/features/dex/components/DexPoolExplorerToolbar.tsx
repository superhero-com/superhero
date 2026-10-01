import { useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronDown, Search, X,
} from 'lucide-react';

import type { TokenPeriod } from './DexTokenExplorerToolbar';

export type PoolSort = 'transactions_count' | 'created_at';
const sorts: PoolSort[] = ['transactions_count', 'created_at'];
const periods: TokenPeriod[] = ['24h', '7d', '30d'];
interface Props {
  search: string;
  sort: PoolSort;
  period: TokenPeriod;
  ascending: boolean;
  onSearch: (value: string) => void;
  onSort: (value: PoolSort) => void;
  onPeriod: (value: TokenPeriod) => void;
  onReverse: () => void;
}

const DexPoolExplorerToolbar = ({
  search, sort, period, ascending, onSearch, onSort, onPeriod, onReverse,
}: Props) => {
  const { t } = useTranslation();
  const searchRef = useRef<HTMLInputElement>(null);
  const sortId = useId();
  const periodId = useId();
  let direction = ascending ? 'fewest' : 'most';
  if (sort === 'created_at') direction = ascending ? 'oldest' : 'newest';
  const clear = () => {
    onSearch('');
    searchRef.current?.focus();
  };
  return (
    <div className="dex-token-toolbar dex-pool-toolbar">
      <div className="dex-token-toolbar__search">
        <Search aria-hidden="true" />
        <input
          ref={searchRef}
          type="search"
          aria-label={t('dex.poolExplorer.search')}
          placeholder={t('dex.poolExplorer.searchPlaceholder')}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Escape') clear(); }}
        />
        {search && <button type="button" aria-label={t('dex.poolExplorer.clear')} onClick={clear}><X aria-hidden="true" /></button>}
      </div>
      <div className="dex-token-toolbar__sort">
        <label className="dex-token-toolbar__select" htmlFor={sortId}>
          <span>{t(sort === 'transactions_count' ? 'dex.poolExplorer.sortAllTime' : 'dex.poolExplorer.sortBy')}</span>
          <select id={sortId} aria-label={t('dex.poolExplorer.sortLabel')} value={sort} onChange={(event) => onSort(event.target.value as PoolSort)}>
            {sorts.map((key) => (
              <option key={key} value={key}>
                {t(`dex.poolExplorer.sort.${key}`)}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" />
        </label>
        <button
          className="dex-token-toolbar__direction"
          type="button"
          title={t(`dex.poolExplorer.direction.${direction}`)}
          aria-label={t('dex.poolExplorer.reverse', { direction: t(`dex.poolExplorer.direction.${direction}`) })}
          onClick={onReverse}
        >
          {ascending ? <ArrowUpNarrowWide aria-hidden="true" /> : <ArrowDownWideNarrow aria-hidden="true" />}
        </button>
      </div>
      <div className="dex-token-toolbar__period">
        <label className="dex-token-toolbar__select dex-token-toolbar__period-select" htmlFor={periodId}>
          <span>{t('dex.poolExplorer.period')}</span>
          <select id={periodId} aria-label={t('dex.poolExplorer.periodLabel')} value={period} onChange={(event) => onPeriod(event.target.value as TokenPeriod)}>
            {periods.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <ChevronDown aria-hidden="true" />
        </label>
        <div className="dex-token-toolbar__period-buttons" role="group" aria-label={t('dex.poolExplorer.periodLabel')}>
          {periods.map((value) => <button key={value} type="button" aria-pressed={value === period} onClick={() => onPeriod(value)}>{value}</button>)}
        </div>
      </div>
    </div>
  );
};

export default DexPoolExplorerToolbar;
