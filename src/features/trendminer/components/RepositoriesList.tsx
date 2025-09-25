import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendminerApi } from '../../../api/backend';
import { Input } from '../../../components/ui/input';
import AeButton from '../../../components/AeButton';
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

const sortBySelectItems = [
  { value: 'score' as const, name: 'Most Trending' },
  { value: 'source' as const, name: 'Source' },
];

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
    return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (abs >= 1_000) {
    return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return n.toFixed(1).replace(/\.0$/, '');
}

function hasToken(repo: Repository): boolean {
  return !!(
    repo?.token_sale_address ||
    repo?.sale_address ||
    repo?.token_address ||
    repo?.tokenSaleAddress ||
    repo?.saleAddress ||
    repo?.token?.address
  );
}

export default function RepositoriesList({ className }: RepositoriesListProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'source'>('score');
  const [isLoading, setIsLoading] = useState(true);
  const [repositoriesResponse, setRepositoriesResponse] = useState<any>(null);
  
  const searchDebounced = useDebounce(search, 300);

  const currentRepositoriesList = useMemo(() => 
    (repositoriesResponse?.items || []).slice(0, 50),
    [repositoriesResponse]
  );

  const onCardAction = (repo: Repository) => {
    if (hasToken(repo)) {
      navigate(`/trendminer/tokens/${repo.tag}`);
    } else {
      navigate(`/trendminer/create?platform=${repo.source}&repo=${repo.tag}`);
    }
  };

  const fetchTrendingRepositories = async () => {
    try {
      setIsLoading(true);
      const response = await TrendminerApi.listTrendingTags({
        orderBy: sortBy,
        orderDirection: 'DESC',
        limit: 50,
        page: 1,
        search: search || undefined,
      });
      setRepositoriesResponse(response);
    } catch (error) {
      console.error('Failed to fetch trending repositories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendingRepositories();
  }, [searchDebounced, sortBy, search]);

  return (
    <div className={cn('repositories-list', className)}>
      {/* Header and Search */}
      <div className="flex items-center gap-2 mt-4">
        <h2 className="text-2xl font-bold text-white">Explore Trends</h2>
        <div className="relative flex-1 max-w-md">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search trends..."
            className="bg-gray-800 text-white border-gray-600 placeholder:text-white/50 focus:border-purple-400"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Sort Filter */}
      <div className="flex gap-2 mt-4">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'score' | 'source')}
          className="px-3 py-2 bg-gray-800 text-white border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-400"
        >
          {sortBySelectItems.map((option) => (
            <option key={option.value} value={option.value}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="py-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="animate-pulse mb-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-600 h-4 w-24 rounded"></div>
                  <div className="bg-gray-600 h-4 w-16 rounded ml-auto"></div>
                  <div className="bg-gray-600 h-8 w-16 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!currentRepositoriesList.length && !isLoading && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-center text-red-400 mt-4">
          <h3 className="font-semibold mb-2">No repositories found</h3>
          <p>Try adjusting your search terms or filters.</p>
        </div>
      )}

      {/* Repository Cards */}
      {!isLoading && currentRepositoriesList.length > 0 && (
        <div className="flex flex-col gap-2 mt-4">
          {currentRepositoriesList.map((repo: Repository) => (
            <div
              key={repo.fullName || repo.tag}
              className="repository-card bg-white/5 rounded-lg border border-white/10 p-4 cursor-pointer transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-lg hover:bg-white/10"
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
              <div className="flex items-center gap-2">
                {/* Tag Name */}
                <div className="text-base font-bold font-mono tracking-wide" style={{ fontSize: '16px', fontWeight: 800, letterSpacing: '0.04em' }}>
                  #{repo.tag}
                </div>
                
                {/* Score */}
                <div className="flex items-center gap-1 ml-auto font-bold">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                  <div className="text-white">{formatCompact(repo.score)}</div>
                </div>

                {/* Action Button */}
                {hasToken(repo) ? (
                  <AeButton
                    variant="ghost"
                    size="sm"
                    className="ml-2 text-white/85 bg-white/8 border border-white/24 hover:bg-white/12"
                    style={{ width: '70px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/trendminer/tokens/${repo.tag}`);
                    }}
                  >
                    View
                  </AeButton>
                ) : (
                  <AeButton
                    variant="accent"
                    size="sm"
                    outlined
                    className="ml-2"
                    style={{ width: '70px' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/trendminer/create?platform=${repo.source}&repo=${repo.tag}`);
                    }}
                  >
                    Tokenize
                  </AeButton>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
