import { useState, useMemo } from 'react';
import { DexService } from '../../../api/generated';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { DataTable, DataTableResponse } from '../../shared/components/DataTable';
import { TransactionCard } from '../components/TransactionCard';
import { Search, Filter, X, RefreshCw, Hash, User } from 'lucide-react';

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
        <div className="mt-2">
          <h1 className="text-xl md:text-2xl font-bold m-0 mb-3 sh-dex-title">
            Advanced Transaction Explorer
          </h1>
          <p className="text-sm md:text-base text-light-font-color m-0 opacity-80 leading-6">
            Filter and explore DEX transactions with advanced controls.
          </p>
        </div>

        {/* Enhanced Filter Controls */}
        <div className="bg-gradient-to-br from-white/[0.05] to-white/[0.02] border border-glass-border rounded-2xl p-6 backdrop-blur-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
          {/* Filter Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Filter className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Advanced Filters</h3>
                <p className="text-sm text-muted-foreground">Refine your transaction search</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleClearFilters}
                variant="outline"
                size="sm"
                className="gap-2 hover:bg-destructive/10 hover:border-destructive/20 hover:text-destructive"
              >
                <X className="h-4 w-4" />
                Clear All
              </Button>
            </div>
          </div>

          {/* Filter Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Transaction Type Filter */}
            <div className="space-y-3">
              <label className="flex  items-center gap-2 text-sm font-medium text-foreground">
                <div className="p-1 bg-blue-500/10 rounded">
                  <RefreshCw className="h-3 w-3 text-blue-500" />
                </div>
                Transaction Type
              </label>
              <Select
                value={filters.txType}
                onValueChange={(value) => handleFilterChange('txType', value)}
              >
                <SelectTrigger className="py-4 h-14 bg-white/[0.05] border-white/10 hover:bg-white/[0.08] transition-colors">
                  <SelectValue placeholder="Select transaction type" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {TX_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="py-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{type.label}</span>
                        {type.value !== 'all' && (
                          <span className="text-xs text-muted-foreground mt-1">
                            {type.value.replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pair Address Filter */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <div className="p-1 bg-green-500/10 rounded">
                  <Hash className="h-3 w-3 text-green-500" />
                </div>
                Pair Address
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter pair contract address"
                  value={filters.pairAddress}
                  onChange={(e) => handleFilterChange('pairAddress', e.target.value)}
                  className="pl-10 h-11 bg-white/[0.05] border-white/10 focus:bg-white/[0.08] transition-colors"
                />
                {filters.pairAddress && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFilterChange('pairAddress', '')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-destructive/10"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Account Address Filter */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <div className="p-1 bg-purple-500/10 rounded">
                  <User className="h-3 w-3 text-purple-500" />
                </div>
                Account Address
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter account address"
                  value={filters.accountAddress}
                  onChange={(e) => handleFilterChange('accountAddress', e.target.value)}
                  className="pl-10 h-11 bg-white/[0.05] border-white/10 focus:bg-white/[0.08] transition-colors"
                />
                {filters.accountAddress && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFilterChange('accountAddress', '')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-destructive/10"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>


        {/* DataTable Implementation */}
        <DataTable
          queryFn={fetchTransactions}
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
            txType: filters.txType,
            pairAddress: filters.pairAddress,
            accountAddress: filters.accountAddress,
          }}
          itemsPerPage={10}
          emptyMessage="No transactions found matching your criteria."
          className="space-y-4"
        />
      </div>
    </div>
  );
}
