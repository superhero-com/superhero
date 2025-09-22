import React from 'react';
import AddressChip from '../AddressChip';

interface Holder {
  address?: string;
  account_address?: string;
  balance?: string | number;
  percentage?: number;
  rank?: number;
}

interface TokenHoldersProps {
  holders: Holder[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore: () => void;
  decimals?: number;
  totalSupply?: string;
}

export default function TokenHolders({ 
  holders, 
  loading = false, 
  hasMore = true, 
  onLoadMore, 
  decimals = 18,
  totalSupply 
}: TokenHoldersProps) {
  
  const formatTokenAmount = (balance: number, decimals: number = 18, fractionDigits = 6): string => {
    if (!isFinite(balance)) return '0';
    const units = balance / Math.pow(10, decimals);
    return units.toLocaleString(undefined, { 
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: 0 
    });
  };

  const calculatePercentage = (balance: string | number): string => {
    if (!totalSupply) return '0';
    try {
      const holderBalance = typeof balance === 'string' ? Number(balance) : balance;
      const total = Number(totalSupply);
      const percentage = (holderBalance / total) * 100;
      return percentage.toFixed(2);
    } catch {
      return '0';
    }
  };

  const getHolderRank = (index: number): number => {
    return index + 1;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center text-xs font-semibold text-white/60 uppercase tracking-wide mb-4 px-4">
        <div>Holder</div>
        <div className="flex gap-8">
          <div>Balance</div>
          <div>%</div>
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-4">
        {holders.map((holder, idx) => {
          const holderAddress = holder.address || holder.account_address || '';
          const balance = Number(holder.balance ?? 0);
          const percentage = calculatePercentage(balance);
          const rank = getHolderRank(idx);

          return (
            <div 
              key={holderAddress || idx} 
              className="flex justify-between items-center text-sm py-3 px-4 bg-white/[0.05] border border-white/10 rounded-xl transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] flex items-center justify-center text-white text-xs font-bold">
                  {rank}
                </div>
                <div className="min-w-0 flex-1">
                  <AddressChip 
                    address={holderAddress}
                    linkToProfile={true}
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-6 text-right">
                <div>
                  <div className="font-semibold text-white">
                    {formatTokenAmount(balance, decimals, 2)}
                  </div>
                  <div className="text-white/60 text-xs">
                    tokens
                  </div>
                </div>
                <div className="min-w-[60px]">
                  <div className="font-semibold text-white">
                    {percentage}%
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1 mt-1">
                    <div 
                      className="bg-gradient-to-r from-[#ff6b6b] to-[#4ecdc4] h-1 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(Number(percentage), 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!holders.length && !loading && (
        <div className="text-center py-12">
          <div className="text-white/40 text-lg mb-2">👥</div>
          <div className="text-white/60 text-sm">
            No holders found
          </div>
          <div className="text-white/40 text-xs mt-1">
            Token holders will appear here once tokens are distributed
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      )}

      {hasMore && !loading && holders.length > 0 && (
        <button
          onClick={onLoadMore}
          className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/[0.05] text-white text-sm font-medium cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-0.5 active:translate-y-0"
        >
          Load more holders
        </button>
      )}
    </div>
  );
}
