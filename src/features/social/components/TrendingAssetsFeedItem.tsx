import { TokensService, type TokenDto } from '@/api/generated';
import TokenChange from '@/components/Trendminer/TokenChange';
import { TokenLineChart } from '@/features/trending/components/TokenLineChart';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router-dom';

const ITEM_LIMIT = 4;

function getTokenAddress(token: TokenDto) {
  return token.sale_address || token.address || '';
}

const TrendingTokenCard = ({ token }: { token: TokenDto }) => {
  const tokenLabel = token.symbol || token.name || 'Unknown';
  const tokenAddress = getTokenAddress(token);
  const tokenHref = `/trends/tokens/${encodeURIComponent(
    token.name || token.address || token.symbol || tokenLabel,
  )}`;

  return (
    <Link
      to={tokenHref}
      className={cn(
        'group rounded-2xl border border-white/10 bg-transparent p-3',
        'hover:bg-white/[0.06] hover:border-white/15 transition-colors',
        'no-underline block',
        'cursor-pointer',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="text-[11px] font-semibold text-[var(--neon-blue)] truncate group-hover:underline underline-offset-2"
        >
          <span className="text-[var(--neon-blue)] mr-0.5">#</span>
          {tokenLabel}

        </div>
        <div className="flex-col text-right gap-2 -mb-2">
          <TokenChange
            token={token}
            hideNewBadge
          />
        </div>
      </div>

      <div className="mt-3">
        {tokenAddress && (
          <TokenLineChart
            saleAddress={tokenAddress}
            height={60}
            width={240}
            showIntervalText
            interval="all-time"
            backgroundEnabled
          />
        )}
      </div>
    </Link>
  );
};

const TrendingAssetsFeedItem = ({ page }: { page: number }) => {
  const orderBy = useMemo(() => {
    if (page <= 1) {
      return 'trending_score';
    }

    return 'market_cap';
  }, [page]);

  const currentPage = useMemo(() => {
    if (page <= 1) {
      return 1;
    }

    return page - 1;
  }, [page]);

  const { data: tokensData, isLoading: tokensLoading } = useQuery<{
    items?: TokenDto[];
  }>({
    queryKey: ['feed-trending-assets', 'tokens', `page-${currentPage}`, orderBy],
    queryFn: () => TokensService.listAll({
      orderBy: orderBy as any,
      orderDirection: 'DESC',
      limit: ITEM_LIMIT,
      page: currentPage,
    }),
    staleTime: 2 * 60 * 1000,
  });

  const topTokens = useMemo<TokenDto[]>(() => {
    const items = tokensData?.items;
    return (Array.isArray(items) ? items : []);
  }, [tokensData]);

  const isLoading = tokensLoading;
  const hasItems = topTokens.length > 0;
  const skeletonKeys = useMemo(
    () => Array.from({ length: ITEM_LIMIT }, (_, idx) => `trending-asset-skeleton-${idx + 1}`),
    [],
  );

  if (!isLoading && !hasItems) {
    return null;
  }

  return (
    <div className="relative w-full px-3 md:px-4 py-4 md:py-5 border-b border-white/10 bg-transparent transition-colors hover:bg-white/[0.04]">
      <div className="w-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[15px] md:text-[16px] font-semibold text-white m-0 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-300" />
            Trending assets
          </h3>
          <Link
            to="/trends/tokens"
            className="text-[12px] md:text-[13px] font-semibold text-[#4ecdc4] hover:text-[#6be4da] transition-colors no-underline"
            onClick={(event) => event.stopPropagation()}
          >
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {isLoading ? (
            skeletonKeys.map((key) => (
              <div
                key={key}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 animate-pulse"
              >
                <div className="h-4 w-16 rounded bg-white/10" />
                <div className="mt-2 h-3 w-10 rounded bg-white/10" />
                <div className="mt-3 h-10 w-full rounded bg-white/10" />
              </div>
            ))
          ) : (
            topTokens.map((token) => (
              <TrendingTokenCard
                key={`trending-asset-${getTokenAddress(token) || token.symbol || token.name}`}
                token={token}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TrendingAssetsFeedItem;
