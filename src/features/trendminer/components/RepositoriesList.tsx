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
    <div className={cn('repositories-list ', className)}>
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 mb-6">
        <h2 className="text-xl font-bold text-white">Explore Trends</h2>

        {/* Search and Sort on single line */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search trends..."
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
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-white/[0.02] border border-white/10 backdrop-blur-[10px] rounded-xl px-4 py-3">
                <div className="space-y-2">
                  {/* First Line: Tag Name and Score */}
                  <div className="flex items-center justify-between">
                    <div className="bg-white/10 h-4 w-24 rounded"></div>
                    <div className="bg-white/10 h-3.5 w-12 rounded"></div>
                  </div>
                  {/* Second Line: Source and Button */}
                  <div className="flex items-center justify-between">
                    <div className="bg-white/10 h-3 w-16 rounded"></div>
                    <div className="bg-white/10 h-6 w-16 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results */}
      {!currentRepositoriesList.length && !isLoading && (
        <div className="bg-white/[0.02] border border-white/10 backdrop-blur-[20px] rounded-[24px] p-6 text-center text-white/80">
          <h3 className="font-semibold mb-2 text-white">No repositories found</h3>
          <p>Try adjusting your search terms or filters.</p>
        </div>
      )}

      {/* Repository Cards */}
      {!isLoading && currentRepositoriesList.length > 0 && (
        <div className="flex flex-col gap-2">
          {currentRepositoriesList.map((repo: Repository) => (
            <div
              key={repo.fullName || repo.tag}
              className="repository-card bg-white/[0.02] rounded-xl border border-white/10 px-4 py-3 cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:transform hover:-translate-y-1 hover:shadow-[0_8px_25px_rgba(17,97,254,0.15)] hover:bg-white/[0.05] backdrop-blur-[10px]"
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
              <div className="space-y-2">
                {/* First Line: Tag Name and Score */}
                <div className="flex items-center justify-between">
                  <div className="text-base font-bold font-mono tracking-wide text-white">
                    #{repo.tag}
                  </div>
                  {repo.source ? (
                    <div className="text-xs text-white/60 font-medium">
                      Via: {repo.source}
                    </div>
                  ) : (
                    <div></div>
                  )}

                </div>

                {/* Second Line: Source and Action Button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 font-medium text-sm">
                    <svg className="w-3.5 h-3.5 text-[#1161FE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                    <span className="text-white/90 text-sm">{formatCompact(repo.score)}</span>
                  </div>
                  {/* Action Button */}
                  {hasToken(repo) ? (
                    <button
                      className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/[0.02] text-white cursor-pointer backdrop-blur-[10px] transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] text-xs font-medium hover:bg-white/[0.08] hover:-translate-y-0.5 active:translate-y-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/trendminer/tokens/${repo.tag}`);
                      }}
                    >
                      View
                    </button>
                  ) : (
                    <button
                      className="px-2.5 py-1.5 rounded-lg border-none text-white cursor-pointer text-xs font-semibold transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] bg-[#1161FE] shadow-[0_2px_8px_rgba(17,97,254,0.4)] hover:shadow-[0_4px_12px_rgba(17,97,254,0.5)] hover:-translate-y-0.5 active:translate-y-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/trendminer/create?platform=${repo.source}&repo=${repo.tag}`);
                      }}
                    >
                      Tokenize
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
