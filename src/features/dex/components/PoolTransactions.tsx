import { useTranslation } from 'react-i18next';
import { DexService } from '@/api/generated';
import { DataTable, DataTableResponse } from '@/features/shared/components/DataTable/DataTable';
import { TransactionCard } from './TransactionCard';

interface PoolTransactionsProps {
  poolAddress?: string;
}

// Wrapper function to convert API response to DataTable format
const fetchTransactions = async (
  params: any,
  pairAddress?: string,
): Promise<DataTableResponse<any>> => {
  if (!pairAddress) {
    return {
      items: [],
      meta: {
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: 10,
        totalPages: 0,
        currentPage: 1,
      },
    };
  }

  const response = await DexService.listAllPairTransactions({
    ...params,
    pairAddress,
    orderBy: 'created_at',
    orderDirection: 'DESC',
  });

  return response as unknown as DataTableResponse<any>;
};

export const PoolTransactions = ({ poolAddress }: PoolTransactionsProps) => {
  const { t } = useTranslation('dex');

  return (
    <div className="liquid-glass liquid-glass--strong rounded-xl p-6 relative overflow-hidden">
      <h3 className="text-lg font-semibold text-white m-0 mb-6">
        {t('poolTransactions.recentTransactions')}
      </h3>
      <DataTable
        queryFn={(params) => fetchTransactions(params, poolAddress)}
        renderRow={({ item, index }) => (
          <TransactionCard key={item.tx_hash || index} transaction={item} />
        )}
        initialParams={{
          orderBy: 'created_at',
          orderDirection: 'DESC',
          pairAddress: poolAddress,
        }}
        itemsPerPage={10}
        emptyMessage={t('poolTransactions.emptyMessage')}
        className="space-y-4"
      />
    </div>
  );
};
