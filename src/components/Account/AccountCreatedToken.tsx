import { TokensService } from '@/api/generated/services/TokensService';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import TokenListTable from '@/features/trending/components/TokenListTable';
import { DataTablePagination } from '@/features/shared/components/DataTable/DataTablePagination';

interface AccountCreatedTokenProps {
  address: string;
  tab: string;
}

const AccountCreatedToken = ({
  address,
  tab,
}: AccountCreatedTokenProps) => {
  const { t } = useTranslation('trending');
  // Token list sorting state shared by Owned/Created
  const [orderBy, setOrderBy] = useState<
    'market_cap' | 'name' | 'price' | 'created_at' | 'holders_count'
  >('market_cap');
  const [orderDirection, setOrderDirection] = useState<'ASC' | 'DESC'>('DESC');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  // Created tokens (paged like Owned tab)
  const { data: createdResp, isFetching: loadingCreated } = useQuery({
    queryKey: [
      'TokensService.listAll',
      'created',
      address,
      orderBy,
      orderDirection,
      page,
      limit,
    ],
    enabled: !!address && tab === 'created',
    queryFn: () => TokensService.listAll({
      creatorAddress: address,
      orderBy,
      orderDirection,
      limit,
      page,
    }) as unknown as Promise<{ items: any[]; meta?: any }>,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    refetchOnMount: false, // Use cached data when switching tabs
  });
  return (
    <div className="mt-4">
      {!loadingCreated && ((createdResp?.items?.length ?? 0) === 0) && (
        <div className="text-center py-12 px-6 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl">
          <div className="text-4xl mb-3 opacity-30">✨</div>
          <div className="text-white font-semibold mb-1">{t('noCreatedTokens')}</div>
          <div className="text-white/60 text-sm">
            {t('noCreatedTokensDescription')}
          </div>
        </div>
      )}
      <TokenListTable
        pages={createdResp ? [{ items: (createdResp.items || []) as any[] }] : [{ items: [] }]}
        loading={loadingCreated}
        showCollectionColumn={false}
        orderBy={orderBy as any}
        orderDirection={orderDirection}
        onSort={(key) => {
          if (key === 'newest') {
            setOrderBy('created_at');
            setOrderDirection('DESC');
            setPage(1);
          } else if (key === 'oldest') {
            setOrderBy('created_at');
            setOrderDirection('ASC');
            setPage(1);
          } else if (key === orderBy) {
            setOrderDirection(orderDirection === 'DESC' ? 'ASC' : 'DESC');
            setPage(1);
          } else {
            setOrderBy(key as any);
            setOrderDirection('DESC');
            setPage(1);
          }
        }}
        rankOffset={(
          (createdResp?.meta?.currentPage || page) - 1
        ) * (createdResp?.meta?.itemsPerPage || limit)}
      />
      <div className="mt-2">
        {createdResp?.meta && (
          <DataTablePagination
            meta={createdResp.meta}
            onPageChange={(p) => setPage(p)}
            onItemsPerPageChange={(n) => {
              setLimit(n);
              setPage(1);
            }}
            isLoading={loadingCreated}
          />
        )}
      </div>
    </div>
  );
};

export default AccountCreatedToken;
