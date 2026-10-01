import { useId, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronDown, Search, X,
} from 'lucide-react';

export type TokenPeriod = '24h' | '7d' | '30d';
export type TokenSort = 'volume' | 'change' | 'price' | 'tvl' | 'pairs_count' | 'created_at' | 'name' | 'symbol';
export type TokenOrder = Exclude<TokenSort, 'volume' | 'change'> | `${TokenPeriod}${'volume' | 'change'}`;
export const tokenOrder = (sort: TokenSort, period: TokenPeriod): TokenOrder => (
  sort === 'volume' || sort === 'change' ? `${period}${sort}` : sort
);
const sorts: TokenSort[] = ['volume', 'change', 'price', 'tvl', 'pairs_count', 'created_at', 'name', 'symbol'];
const periods: TokenPeriod[] = ['24h', '7d', '30d'];
interface Props {
  search: string;
  sort: TokenSort;
  period: TokenPeriod;
  ascending: boolean;
  onSearch: (value: string) => void;
  onSort: (value: TokenSort) => void;
  onPeriod: (value: TokenPeriod) => void;
  onReverse: () => void;
}

const DexTokenExplorerToolbar = ({
  search, sort, period, ascending, onSearch, onSort, onPeriod, onReverse,
}: Props) => {
  const { t } = useTranslation();
  const searchRef = useRef<HTMLInputElement>(null);
  const sortId = useId();
  const periodId = useId();
  let direction = ascending ? 'lowest' : 'highest';
  if (sort === 'name' || sort === 'symbol') direction = ascending ? 'az' : 'za';
  if (sort === 'created_at') direction = ascending ? 'oldest' : 'newest';
  const clear = () => {
    onSearch('');
    searchRef.current?.focus();
  };
  return (
    <div className="dex-token-toolbar">
      <div className="dex-token-toolbar__search">
        <Search aria-hidden="true" />
        <input
          ref={searchRef}
          type="search"
          aria-label={t('dex.tokenExplorer.search')}
          placeholder={t('dex.tokenExplorer.searchPlaceholder')}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Escape') clear(); }}
        />
        {search && <button type="button" aria-label={t('dex.tokenExplorer.clear')} onClick={clear}><X aria-hidden="true" /></button>}
      </div>
      <div className="dex-token-toolbar__sort">
        <label className="dex-token-toolbar__select" htmlFor={sortId}>
          <span>{t('dex.tokenExplorer.sortBy')}</span>
          <select id={sortId} aria-label={t('dex.tokenExplorer.sortLabel')} value={sort} onChange={(event) => onSort(event.target.value as TokenSort)}>
            {sorts.map((key) => (
              <option key={key} value={key}>
                {t(`dex.tokenExplorer.sort.${key}`)}
                {(key === 'volume' || key === 'change') && ` · ${period}`}
              </option>
            ))}
          </select>
          <ChevronDown aria-hidden="true" />
        </label>
        <button
          className="dex-token-toolbar__direction"
          type="button"
          title={t(`dex.tokenExplorer.direction.${direction}`)}
          aria-label={t('dex.tokenExplorer.reverse', { direction: t(`dex.tokenExplorer.direction.${direction}`) })}
          onClick={onReverse}
        >
          {ascending ? <ArrowUpNarrowWide aria-hidden="true" /> : <ArrowDownWideNarrow aria-hidden="true" />}
        </button>
      </div>
      <div className="dex-token-toolbar__period">
        <label className="dex-token-toolbar__select dex-token-toolbar__period-select" htmlFor={periodId}>
          <span>{t('dex.tokenExplorer.period')}</span>
          <select id={periodId} aria-label={t('dex.tokenExplorer.periodLabel')} value={period} onChange={(event) => onPeriod(event.target.value as TokenPeriod)}>
            {periods.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
          <ChevronDown aria-hidden="true" />
        </label>
        <div className="dex-token-toolbar__period-buttons" role="group" aria-label={t('dex.tokenExplorer.periodLabel')}>
          {periods.map((value) => <button key={value} type="button" aria-pressed={value === period} onClick={() => onPeriod(value)}>{value}</button>)}
        </div>
      </div>
    </div>
  );
};

export default DexTokenExplorerToolbar;
