import React, {
  useCallback, useState, useEffect, useMemo,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Decimal } from '@/libs/decimal';
import { SuperheroApi } from '../../../api/backend';
import { Input } from '../../../components/ui/input';
import { cn } from '../../../lib/utils';

interface Repository {
  fullName: string;
  tag: string;
  score: number;
  source?: string;
  token_sale_address?: string;
  sale_address?: string;
  token_address?: string;
  tokenSaleAddress?: string;
  saleAddress?: string;
  token?: {
    address?: string;
  };
}

interface RepositoriesListProps {
  className?: string;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function formatCompact(value: number | string): string {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (abs >= 1_000) {
    return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return n.toFixed(1).replace(/\.0$/, '');
}

function hasToken(repo: Repository): boolean {
  return !!(
    repo?.token_sale_address
    || repo?.sale_address
    || repo?.token_address
    || repo?.tokenSaleAddress
    || repo?.saleAddress
    || repo?.token?.address
  );
}

const RepositoriesList = ({ className }: RepositoriesListProps) => {
  const { t } = useTranslation('explore');
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortBy] = useState<'score' | 'source'>('score');
  const [isLoading, setIsLoading] = useState(true);
  const [repositoriesResponse, setRepositoriesResponse] = useState<any>(null);

  const searchDebounced = useDebounce(search, 300);

  const currentRepositoriesList = useMemo(
    () => (repositoriesResponse?.items || []).slice(0, 50),
    [repositoriesResponse],
  );

  const onCardAction = (repo: Repository) => {
    if (hasToken(repo)) {
      navigate(`/trends/tokens/${repo.tag}`);
    } else {
      navigate(`/trends/create?platform=${repo.source}&tokenName=${repo.tag}`);
    }
  };

  const fetchTrendingRepositories = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await SuperheroApi.listTrendingTags({
        orderBy: sortBy,
        orderDirection: 'DESC',
        limit: 20, // shouldn't be bigger than the tokens list as it can break the scroll
        page: 1,
        search: searchDebounced || undefined,
      });
      setRepositoriesResponse(response);
    } catch (error) {
      console.error('Failed to fetch trending repositories:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sortBy, searchDebounced]);

  useEffect(() => {
    fetchTrendingRepositories();
  }, [fetchTrendingRepositories]);

  return (
    <div className={cn('repositories-list ', className)}>
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 mb-6">
        <h2 className="text-xl font-bold text-white">{t('exploreTrends')}</h2>

        {/* Search and Sort on single line */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchTrendsPlaceholder')}
              className="bg-white/[0.02] text-white border border-white/10 backdrop-blur-[10px] rounded-xl placeholder:text-white/50 focus:outline-none focus:border-[#1161FE] transition-all duration-300 hover:bg-white/[0.05] h-10"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'score' | 'source')}
            className="px-3 py-2 bg-white/[0.02] text-white border border-white/10 backdrop-blur-[10px] rounded-xl text-sm focus:outline-none focus:border-[#1161FE] transition-all duration-300 hover:bg-white/[0.05] h-10 min-w-[140px]"
          >
            {sortBySelectItems.map((option) => (
              <option key={option.value} value={option.value} className="bg-gray-900">
                {option.name}
              </option>
            ))}
          </select> */}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col gap-2">
          {['row-1', 'row-2', 'row-3', 'row-4', 'row-5'].map((rowKey) => (
            <div key={rowKey} className="animate-pulse">
              <div className="px-4 py-2.5">
                {/* Single Line Layout Skeleton */}
                <div className="flex items-center justify-between gap-3">
                  {/* Left: Tag Name */}
                  <div className="bg-white/10 h-4 w-24 rounded flex-shrink-0" />

                  {/* Center: Score and Source */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="bg-white/10 h-3.5 w-12 rounded" />
                    <div className="bg-white/10 h-3 w-16 rounded" />
                  </div>

                  {/* Right: Action Button */}
                  <div className="bg-white/10 h-6 w-16 rounded flex-shrink-0" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!currentRepositoriesList.length && !isLoading && (
        <div className="bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-6 text-center text-white/80">
          <h3 className="font-semibold mb-2 text-white">{t('noRepositoriesFound')}</h3>
          <p>{t('tryAdjustingSearch')}</p>
        </div>
      )}

      {/* Repository Cards */}
      {!isLoading && currentRepositoriesList.length > 0 && (
        <div className="flex flex-col gap-2">
          {currentRepositoriesList.map((repo: Repository) => (
            <div
              key={repo.fullName || repo.tag}
              className="py-2 cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:transform hover:-translate-y-1"
              role="button"
              tabIndex={0}
              onClick={() => onCardAction(repo)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onCardAction(repo);
                }
              }}
            >
              {/* Single Line Layout: Tag, Score, Source, Action */}
              <div className="flex items-center justify-between gap-1">
                {/* Left: Tag Name */}
                <div className="flex text-sm font-bold font-mono tracking-wide text-white flex-shrink-0 truncate">
                  {String(repo.tag).substring(0, 20)}
                  {String(repo.tag).length > 20 && '...'}
                </div>

                <div className="flex justify-end items-end gap-3 flex-1 min-w-0 text-right">
                  {/* Center: Score and Source */}
                  {
                    hasToken(repo) ? (
                      <div className="text-xs text-white/60 font-medium truncate">
                        {Decimal.from((repo as any).token?.price || 0).prettify()}
                        {' '}
                        AE
                        Holders:
                        {(repo as any).token?.holders_count ?? 0}

                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-3 flex-1 min-w-0 text-right">
                        <div className="flex items-center gap-1 font-medium text-sm">
                          <svg className="w-3.5 h-3.5 text-[#1161FE] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                          </svg>
                          <span className="text-white/90 text-sm">{formatCompact(repo.score)}</span>
                        </div>
                        {
                          repo.source && (
                            <a
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              target="_blank"
                              href={`https://x.com/search?q=${encodeURIComponent(`#${repo.tag}`)}&src=typed_query`}
                              className="text-xs text-white/60 font-medium"
                              rel="noreferrer"
                            >
                              Via:
                              {' '}
                              {repo.source}
                            </a>
                          )
                        }
                      </div>
                    )
                  }

                  {/* Right: Action Button */}
                  <div className="flex-shrink-0">
                    {hasToken(repo) ? (
                      <button
                        type="button"
                        className="px-2 py-1 rounded-lg border-none text-white cursor-pointer text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/trends/tokens/${repo.tag}`);
                        }}
                      >
                        View
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="px-2 py-1 rounded-lg border-none text-white cursor-pointer text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/trends/create?platform=${repo.source}&tokenName=${repo.tag}`);
                        }}
                      >
                        Tokenize
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

export default RepositoriesList;
