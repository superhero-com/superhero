import { TokensService, type TokenDto } from '@/api/generated';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import TrendingAssetsPanel from './TrendingAssetsPanel';

const ITEM_LIMIT = 4;

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

  if (!isLoading && !hasItems) {
    return null;
  }

  return <TrendingAssetsPanel items={topTokens} loading={isLoading} byMarketCap={page > 1} />;
};

export default TrendingAssetsFeedItem;
