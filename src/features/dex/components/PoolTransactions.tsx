import { DexService } from "@/api/generated";
import { DataTable, DataTableResponse } from "@/features/shared/components/DataTable/DataTable";
import { TransactionCard } from "./TransactionCard";

interface PoolTransactionsProps {
  poolAddress?: string;
}

// Wrapper function to convert API response to DataTable format
const fetchTransactions = async (
  params: any,
  pairAddress?: string
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
    orderBy: "created_at",
    orderDirection: "DESC",
  });

  return response as unknown as DataTableResponse<any>;
};

export function PoolTransactions({ poolAddress }: PoolTransactionsProps) {
  return (
    <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4),0_8px_24px_rgba(0,0,0,0.3)] relative overflow-hidden">
      <h3 className="text-lg font-semibold text-white m-0 mb-6">
        Recent Transactions
      </h3>
      <DataTable
        queryFn={(params) => fetchTransactions(params, poolAddress)}
        renderRow={({ item, index }) => (
          <TransactionCard key={item.tx_hash || index} transaction={item} />
        )}
        initialParams={{
          orderBy: "created_at",
          orderDirection: "DESC",
          pairAddress: poolAddress,
        }}
        itemsPerPage={10}
        emptyMessage="No transactions found for this pool. Trading activity will appear here."
        className="space-y-4"
      />
    </div>
  );
}
