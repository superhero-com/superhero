import React from 'react';
import { useAeSdk } from '../hooks';
import { AeCard, AeCardContent } from './ui/ae-card';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

interface TransactionData {
  hash: string;
  type: 'SwapTokens' | 'CreatePair' | 'PairMint';
  pairAddress?: string;
  senderAccount?: string;
  reserve0?: string;
  reserve1?: string;
  deltaReserve0?: string;
  deltaReserve1?: string;
  token0AePrice?: string;
  token1AePrice?: string;
  aeUsdPrice?: string;
  height?: number;
  microBlockHash?: string;
  microBlockTime?: string;
  transactionHash?: string;
  transactionIndex?: string;
  logIndex?: number;
  reserve0Usd?: string;
  reserve1Usd?: string;
  delta0UsdValue?: string;
  delta1UsdValue?: string;
  txUsdFee?: string;
}

interface TransactionCardProps {
  transaction: TransactionData;
  getTransactionTokens: (tx: TransactionData) => {
    token0Symbol: string;
    token1Symbol: string;
  };
}

export const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction: tx,
  getTransactionTokens
}) => {
  const { activeNetwork } = useAeSdk();

  // Format number utility (copied from TokenDetail)
  const formatNumber = (num: number | string | undefined, decimals = 2) => {
    const n = Number(num || 0);
    if (n === 0) return '0';
    if (n < 0.01) return '< 0.01';
    if (n < 1000) return n.toFixed(decimals);
    if (n < 1000000) return `${(n / 1000).toFixed(1)}K`;
    if (n < 1000000000) return `${(n / 1000000).toFixed(1)}M`;
    return `${(n / 1000000000).toFixed(1)}B`;
  };

  return (
    <AeCard 
      variant="glass" 
      className="transition-all duration-300 hover:-translate-y-1 hover:shadow-glow hover:bg-gradient-to-br hover:from-accent/8 hover:to-glass-bg/40"
    >
      <AeCardContent className="p-4">
        {/* Transaction Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="text-base font-bold text-foreground">
            {tx.type === 'SwapTokens' ? `Swap ${getTransactionTokens(tx).token0Symbol} → ${getTransactionTokens(tx).token1Symbol}` :
             tx.type === 'PairMint' ? `Add Liquidity ${getTransactionTokens(tx).token0Symbol} / ${getTransactionTokens(tx).token1Symbol}` :
             tx.type === 'CreatePair' ? `Create ${getTransactionTokens(tx).token0Symbol} / ${getTransactionTokens(tx).token1Symbol} Pool` :
             tx.type || 'Transaction'}
          </div>
          {tx.microBlockTime && (
            <div className="text-xs text-muted-foreground">
              {new Date(Number(tx.microBlockTime) * 1000).toLocaleDateString()}
            </div>
          )}
        </div>

        {/* Swap Details */}
        {tx.type === 'SwapTokens' && (
          <div className="grid grid-cols-3 gap-3 items-center p-3 bg-muted/20 rounded-xl border border-muted/50 mb-2">
            <div className="text-center">
              <div className="text-xs text-muted-foreground font-semibold mb-1">FROM</div>
              <div className="text-base font-bold text-destructive font-mono mb-1">
                -{tx.deltaReserve0 ? formatNumber(Math.abs(Number(tx.deltaReserve0)) / 1e18, 6) : '—'}
              </div>
              <Badge variant="destructive" className="text-xs px-2 py-1">
                {getTransactionTokens(tx).token0Symbol}
              </Badge>
              {tx.delta0UsdValue && (
                <div className="text-xs text-muted-foreground mt-1">
                  ≈ ${formatNumber(Number(tx.delta0UsdValue), 2)}
                </div>
              )}
            </div>
            <div className="text-xl text-accent font-bold text-center">→</div>
            <div className="text-center">
              <div className="text-xs text-muted-foreground font-semibold mb-1">TO</div>
              <div className="text-base font-bold text-success font-mono mb-1">
                +{tx.deltaReserve1 ? formatNumber(Math.abs(Number(tx.deltaReserve1)) / 1e18, 6) : '—'}
              </div>
              <Badge className="text-xs px-2 py-1 bg-success/20 text-success border-success/30">
                {getTransactionTokens(tx).token1Symbol}
              </Badge>
              {tx.delta1UsdValue && (
                <div className="text-xs text-muted-foreground mt-1">
                  ≈ ${formatNumber(Number(tx.delta1UsdValue), 2)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transaction Value */}
        {(tx.delta0UsdValue || tx.delta1UsdValue || tx.txUsdFee) && (
          <div className="flex justify-between items-center p-2 bg-muted/20 rounded-lg border border-muted/50 mb-2">
            <span className="text-xs text-muted-foreground font-semibold">Value:</span>
            <div className="text-sm font-bold text-accent font-mono">
              ${formatNumber((Number(tx.delta0UsdValue || 0) + Number(tx.delta1UsdValue || 0)), 2)}
              {tx.txUsdFee && (
                <span className="text-xs text-muted-foreground ml-2">
                  (Fee: ${formatNumber(Number(tx.txUsdFee), 4)})
                </span>
              )}
            </div>
          </div>
        )}

        {/* Transaction Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-muted/50">
          {tx.hash && (
            <Badge 
              variant="outline"
              className="text-xs font-mono cursor-pointer hover:bg-accent/10 transition-colors"
              onClick={() => {
                if (activeNetwork?.explorerUrl) {
                  window.open(`${activeNetwork.explorerUrl}/transactions/${tx.hash}`, '_blank');
                }
              }}
            >
              📋 {tx.hash.slice(0, 8)}...{tx.hash.slice(-6)}
            </Badge>
          )}
          {tx.pairAddress && (
            <div className="text-xs text-muted-foreground font-mono">
              🏊 {tx.pairAddress.slice(0, 6)}...{tx.pairAddress.slice(-4)}
            </div>
          )}
        </div>
      </AeCardContent>
    </AeCard>
  );
};
