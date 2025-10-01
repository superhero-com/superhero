import { PairTransactionDto } from '@/api/generated/models/PairTransactionDto';
import { AeCard, AeCardContent } from '@/components/ui/ae-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAeSdk } from '@/hooks';
import { Decimal } from '@/libs/decimal';
import moment from 'moment';
import React from 'react';

interface TransactionCardProps {
  transaction: PairTransactionDto;
}

// Transaction type mapping with icons and colors
const TX_TYPE_CONFIG = {
  'swap_exact_tokens_for_tokens': {
    label: 'Token to Token Swap (Exact)',
    icon: '🔄',
    color: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
    description: 'Swap exact amount of tokens for tokens'
  },
  'swap_tokens_for_exact_tokens': {
    label: 'Token to Token Swap (For Exact)',
    icon: '🔄',
    color: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
    description: 'Swap tokens for exact amount of tokens'
  },
  'swap_exact_ae_for_tokens': {
    label: 'AE to Token Swap (Exact)',
    icon: '💰',
    color: 'bg-green-500/20 text-green-600 border-green-500/30',
    description: 'Swap exact amount of AE for tokens'
  },
  'swap_exact_tokens_for_ae': {
    label: 'Token to AE Swap (Exact)',
    icon: '💰',
    color: 'bg-green-500/20 text-green-600 border-green-500/30',
    description: 'Swap exact amount of tokens for AE'
  },
  'swap_tokens_for_exact_ae': {
    label: 'Token to AE Swap (For Exact)',
    icon: '💰',
    color: 'bg-green-500/20 text-green-600 border-green-500/30',
    description: 'Swap tokens for exact amount of AE'
  },
  'swap_ae_for_exact_tokens': {
    label: 'AE to Token Swap (For Exact)',
    icon: '💰',
    color: 'bg-green-500/20 text-green-600 border-green-500/30',
    description: 'Swap AE for exact amount of tokens'
  },
  'add_liquidity': {
    label: 'Add Liquidity (Token Pairs)',
    icon: '➕',
    color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
    description: 'Add liquidity to token pair'
  },
  'add_liquidity_ae': {
    label: 'Add Liquidity (AE Pairs)',
    icon: '➕',
    color: 'bg-emerald-500/20 text-emerald-600 border-emerald-500/30',
    description: 'Add liquidity to AE pair'
  },
  'remove_liquidity': {
    label: 'Remove Liquidity (Token Pairs)',
    icon: '➖',
    color: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
    description: 'Remove liquidity from token pair'
  },
  'remove_liquidity_ae': {
    label: 'Remove Liquidity (AE Pairs)',
    icon: '➖',
    color: 'bg-orange-500/20 text-orange-600 border-orange-500/30',
    description: 'Remove liquidity from AE pair'
  }
};

export const TransactionCard: React.FC<TransactionCardProps> = ({
  transaction
}) => {
  const { activeNetwork } = useAeSdk();

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = moment();
    const diffDays = now.diff(date, 'days');
    
    if (diffDays >= 1) {
      // Show European date format (DD/MM/YYYY) for dates more than a day ago
      return moment(date).format('DD/MM/YYYY');
    }
    
    return moment(date).fromNow();
  };

  // Get transaction type configuration
  const txConfig = TX_TYPE_CONFIG[transaction.tx_type as keyof typeof TX_TYPE_CONFIG] || {
    label: transaction.tx_type,
    icon: '📄',
    color: 'bg-gray-500/20 text-gray-600 border-gray-500/30',
    description: 'Transaction'
  };

  // Format token amount with decimals using Decimal for precision
  const formatTokenAmount = (amount: string, decimals: number) => {
    const num = Decimal.from(amount);
    // Avoid using pow method to prevent assert error
    const divisor = Math.pow(10, decimals);
    const result = num.div(divisor);
    return Decimal.from(result.toString()).shorten();
  };

  // Copy to clipboard function
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <AeCard
      variant="glass"
      className="transition-all duration-300 hover:-translate-y-1 hover:shadow-glow hover:bg-gradient-to-br hover:from-accent/8 hover:to-glass-bg/40"
    >
      <AeCardContent className="p-6">
        {/* Transaction Header */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{txConfig.icon}</span>
              <div>
                <div className="text-lg font-bold text-foreground">
                  {txConfig.label}
                </div>
                <div className="text-sm text-muted-foreground">
                  {txConfig.description}
                </div>
              </div>
            </div>
            <Badge className={`px-3 py-1 text-xs font-medium border ${txConfig.color}`}>
              {transaction.tx_type}
            </Badge>
          </div>

          <div className="text-sm text-muted-foreground">
            {formatTimestamp(transaction.created_at)}
          </div>
        </div>

        {/* Pair Information */}
        <div className="bg-muted/20 rounded-xl p-4 border border-muted/50 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-muted-foreground">Trading Pair</span>
            <Badge variant="outline" className="text-xs">
              {transaction.pair.transactions_count} transactions
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-sm font-bold text-foreground">
                  {transaction.pair.token0.symbol}
                </div>
                <div className="text-xs text-muted-foreground">
                  {transaction.pair.token0.name}
                </div>
                {transaction.pair.token0.is_ae && (
                  <Badge className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                    AE
                  </Badge>
                )}
              </div>

              <div className="text-lg text-muted-foreground">/</div>

              <div className="text-center">
                <div className="text-sm font-bold text-foreground">
                  {transaction.pair.token1.symbol}
                </div>
                <div className="text-xs text-muted-foreground">
                  {transaction.pair.token1.name}
                </div>
                {transaction.pair.token1.is_ae && (
                  <Badge className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-600 border-yellow-500/30">
                    AE
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pool Reserves */}
        <div className="bg-muted/20 rounded-xl p-4 border border-muted/50 mb-4">
          <div className="text-sm font-semibold text-muted-foreground mb-3">Pool Reserves</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-foreground font-mono">
                {formatTokenAmount(transaction.pair.reserve0, transaction.pair.token0.decimals)}
              </div>
              <div className="text-xs text-muted-foreground">
                {transaction.pair.token0.symbol}
              </div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-foreground font-mono">
                {formatTokenAmount(transaction.pair.reserve1, transaction.pair.token1.decimals)}
              </div>
              <div className="text-xs text-muted-foreground">
                {transaction.pair.token1.symbol}
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Footer */}
        <div className="flex flex-col gap-3 pt-4 border-t border-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Transaction Hash:</span>
              <Badge
                variant="outline"
                className="text-xs font-mono cursor-pointer hover:bg-accent/10 transition-colors"
                onClick={() => copyToClipboard(transaction.tx_hash)}
              >
                📋 {transaction.tx_hash.slice(0, 8)}...{transaction.tx_hash.slice(-6)}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeNetwork?.explorerUrl) {
                  window.open(`${activeNetwork.explorerUrl}/transactions/${transaction.tx_hash}`, '_blank');
                }
              }}
              className="text-xs"
            >
              View on Explorer
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Pair Address:</span>
            <Badge
              variant="outline"
              className="text-xs font-mono cursor-pointer hover:bg-accent/10 transition-colors"
              onClick={() => copyToClipboard(transaction.pair.address)}
            >
              🏊 {transaction.pair.address.slice(0, 8)}...{transaction.pair.address.slice(-6)}
            </Badge>
          </div>
        </div>
      </AeCardContent>
    </AeCard>
  );
};
