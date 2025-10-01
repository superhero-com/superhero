import { useState } from 'react';
import { DexService } from '../../../api/generated';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { DataTable, DataTableResponse } from '../../shared/components/DataTable';
import { TransactionCard } from '../components/TransactionCard';

// Transaction types mapping with meaningful names
const TX_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'swap_exact_tokens_for_tokens', label: 'Token to Token Swap (Exact)' },
  { value: 'swap_tokens_for_exact_tokens', label: 'Token to Token Swap (For Exact)' },
  { value: 'swap_exact_ae_for_tokens', label: 'AE to Token Swap (Exact)' },
  { value: 'swap_exact_tokens_for_ae', label: 'Token to AE Swap (Exact)' },
  { value: 'swap_tokens_for_exact_ae', label: 'Token to AE Swap (For Exact)' },
  { value: 'swap_ae_for_exact_tokens', label: 'AE to Token Swap (For Exact)' },
  { value: 'add_liquidity', label: 'Add Liquidity (Token Pairs)' },
  { value: 'add_liquidity_ae', label: 'Add Liquidity (AE Pairs)' },
  { value: 'remove_liquidity', label: 'Remove Liquidity (Token Pairs)' },
  { value: 'remove_liquidity_ae', label: 'Remove Liquidity (AE Pairs)' },
];

// Wrapper function to convert API response to DataTable format
const fetchTransactions = async (params: any): Promise<DataTableResponse<any>> => {
  const response = await DexService.listAllPairTransactions({
    ...params,
    txType: params.txType !== 'all' ? params.txType : undefined,
    pairAddress: params.pairAddress || undefined,
    accountAddress: params.accountAddress || undefined,
  });

  // The API response is already in the correct format, just cast it
  return response as unknown as DataTableResponse<any>;
};

// Advanced example showing how to use DataTable with filters and custom parameters
export default function DexExploreTransactions() {
  const [filters, setFilters] = useState({
    txType: 'all',
    pairAddress: '',
    accountAddress: '',
  });

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      txType: 'all',
      pairAddress: '',
      accountAddress: '',
    });
  };


  return (
    <div className="mx-auto md:pt-0 md:px-2 flex flex-col gap-6 md:gap-8 min-h-screen">
      <div className="grid grid-cols-1 gap-6 md:gap-8 items-start">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-bold m-0 mb-3 sh-dex-title">
            Advanced Transaction Explorer
          </h1>
          <p className="text-sm md:text-base text-light-font-color m-0 opacity-80 leading-6">
            Filter and explore DEX transactions with advanced controls.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="bg-white/[0.03] border border-glass-border rounded-xl p-4 backdrop-blur-[15px] shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Transaction Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Transaction Type</label>
              <Select
                value={filters.txType}
                onValueChange={(value) => handleFilterChange('txType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TX_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pair Address Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Pair Address</label>
              <Input
                placeholder="Enter pair address"
                value={filters.pairAddress}
                onChange={(e) => handleFilterChange('pairAddress', e.target.value)}
              />
            </div>

            {/* Account Address Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Account Address</label>
              <Input
                placeholder="Enter account address"
                value={filters.accountAddress}
                onChange={(e) => handleFilterChange('accountAddress', e.target.value)}
              />
            </div>

            {/* Filter Actions */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Actions</label>
              <div className="flex gap-2">
                <Button onClick={handleClearFilters} variant="outline" size="sm">
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </div>


        {/* DataTable Implementation */}
        <DataTable
          queryFn={(params) => fetchTransactions({
            ...params,
            txType: filters.txType,
            pairAddress: filters.pairAddress,
            accountAddress: filters.accountAddress,
          })}
          renderRow={({ item, index }) => (
            <TransactionCard
              key={item.tx_hash || index}
              transaction={item}
            />
          )}
          initialParams={{
            limit: 10,
            page: 1,
            orderBy: 'created_at',
            orderDirection: 'DESC',
          }}
          itemsPerPage={10}
          emptyMessage="No transactions found matching your criteria."
          className="space-y-4"
        />
      </div>
    </div>
  );
}
