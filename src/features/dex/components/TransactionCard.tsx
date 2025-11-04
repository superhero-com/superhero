import { PairTransactionDto } from '@/api/generated/models/PairTransactionDto';
import { AeCard, AeCardContent } from '@/components/ui/ae-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAeSdk } from '@/hooks';
import { Decimal } from '@/libs/decimal';
import { Clock, Copy, ExternalLink } from 'lucide-react';
import moment from 'moment';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TransactionCardProps {
  transaction: PairTransactionDto;
}

/* --- Styling presets for tx types (colors kept consistent, toned down saturation) --- */
const TX_TYPE_CONFIG = {
  swap_exact_tokens_for_tokens: {
    label: 'Token → Token (Exact)',
    icon: '🔄',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    chip: 'text-[10px] tracking-wide uppercase',
    description: 'Swap exact amount of tokens for tokens',
  },
  swap_tokens_for_exact_tokens: {
    label: 'Token → Token (For Exact)',
    icon: '🔄',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    chip: 'text-[10px] tracking-wide uppercase',
    description: 'Swap tokens for exact amount of tokens',
  },
  swap_exact_ae_for_tokens: {
    label: 'AE → Token (Exact)',
    icon: '💰',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    chip: 'text-[10px] tracking-wide uppercase',
    description: 'Swap exact amount of AE for tokens',
  },
  swap_exact_tokens_for_ae: {
    label: 'Token → AE (Exact)',
    icon: '💰',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    chip: 'text-[10px] tracking-wide uppercase',
    description: 'Swap exact amount of tokens for AE',
  },
  swap_tokens_for_exact_ae: {
    label: 'Token → AE (For Exact)',
    icon: '💰',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    chip: 'text-[10px] tracking-wide uppercase',
    description: 'Swap tokens for exact amount of AE',
  },
  swap_ae_for_exact_tokens: {
    label: 'AE → Token (For Exact)',
    icon: '💰',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    chip: 'text-[10px] tracking-wide uppercase',
    description: 'Swap AE for exact amount of tokens',
  },
  add_liquidity: {
    label: 'Add Liquidity (Tokens)',
    icon: '➕',
    color: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
    chip: 'text-[10px] tracking-wide uppercase',
    description: 'Add liquidity to token pair',
  },
  add_liquidity_ae: {
    label: 'Add Liquidity (AE)',
    icon: '➕',
    color: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
    chip: 'text-[10px] tracking-wide uppercase',
    description: 'Add liquidity to AE pair',
  },
  remove_liquidity: {
    label: 'Remove Liquidity (Tokens)',
    icon: '➖',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    chip: 'text-[10px] tracking-wide uppercase',
    description: 'Remove liquidity from token pair',
  },
  remove_liquidity_ae: {
    label: 'Remove Liquidity (AE)',
    icon: '➖',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    chip: 'text-[10px] tracking-wide uppercase',
    description: 'Remove liquidity from AE pair',
  },
} as const;

/* --- Small reusable copy pill with feedback --- */
const CopyPill: React.FC<{ text: string; icon?: React.ReactNode; label: string; className?: string }> = ({
  text,
  icon,
  label,
  className,
}) => {
  const { t } = useTranslation('common');
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        } catch { }
      }}
      className={[
        'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-mono',
        'transition-colors hover:bg-accent/10',
        copied ? 'border-green-500/40 text-green-600' : 'border-border text-muted-foreground',
        className || '',
      ].join(' ')}
      title={text}
      aria-label={`${t('actions.copy')} ${label}`}
    >
      {icon ?? <Copy className="h-3.5 w-3.5" />}
      <span className="truncate">{label}</span>
      {copied && <span className="ml-1 text-[10px] font-semibold">{t('buttons.copied')}</span>}
    </button>
  );
};

export const TransactionCard: React.FC<TransactionCardProps> = ({ transaction }) => {
  const { t } = useTranslation('dex');
  const { activeNetwork } = useAeSdk();

  // Get translated labels and descriptions
  const getTxConfig = (txType: string) => {
    const baseConfig = (TX_TYPE_CONFIG as any)[txType];
    if (!baseConfig) {
      return {
        label: txType,
        icon: '📄',
        color: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
        chip: 'text-[10px] tracking-wide uppercase',
        description: 'Transaction',
      };
    }
    
    // Map tx_type to translation keys
    const translationKeyMap: Record<string, string> = {
      'swap_exact_tokens_for_tokens': 'transactions.swapExactTokensForTokens',
      'swap_exact_tokens_for_ae': 'transactions.swapExactTokensForAe',
      'swap_exact_ae_for_tokens': 'transactions.swapExactAeForTokens',
      'add_liquidity': 'transactions.addLiquidity',
      'add_liquidity_ae': 'transactions.addLiquidityAe',
      'remove_liquidity': 'transactions.removeLiquidity',
      'remove_liquidity_ae': 'transactions.removeLiquidityAe',
    };
    
    const translationKey = translationKeyMap[txType];
    if (translationKey) {
      return {
        ...baseConfig,
        label: t(`${translationKey}.label`),
        description: t(`${translationKey}.description`),
      };
    }
    
    return baseConfig;
  };

  const txConfig = getTxConfig(transaction.tx_type);

  const isLiquidityTransaction = transaction.tx_type.includes('liquidity');

  const hasSwapInfo =
    !!transaction.swap_info &&
    (transaction.swap_info.amount0In !== '0' ||
      transaction.swap_info.amount1In !== '0' ||
      transaction.swap_info.amount0Out !== '0' ||
      transaction.swap_info.amount1Out !== '0');

  const formatTimestamp = (iso: string) => {
    const date = new Date(iso);
    const now = moment();
    const diffDays = now.diff(date, 'days');
    return diffDays >= 1 ? moment(date).format('DD/MM/YYYY') : moment(date).fromNow();
  };

  const formattedExactTime = useMemo(
    () => moment(transaction.created_at).format('YYYY-MM-DD HH:mm:ss'),
    [transaction.created_at]
  );

  const formatTokenAmount = (amount: string, decimals: number) => {
    const num = Decimal.from(amount);
    // const divisor = Math.pow(10, decimals);
    // const result = num.div(divisor);
    return Decimal.from(amount).div(10 ** decimals).prettify();
  };

  const dividerAccent = isLiquidityTransaction ? 'from-teal-500/20' : hasSwapInfo ? 'from-blue-500/20' : 'from-gray-500/20';

  return (
    <AeCard
      variant="glass"
      className={[
        'group relative overflow-hidden',
        'transition-all duration-300 hover:-translate-y-0.5',
        'border border-border/60 bg-gradient-to-br from-background/60 to-background/30',
        'backdrop-blur-xl',
        isLiquidityTransaction
          ? 'ring-1 ring-teal-500/20'
          : hasSwapInfo
            ? 'ring-1 ring-blue-500/20'
            : 'ring-1 ring-foreground/10',
      ].join(' ')}
    >
      {/* top accent line */}
      <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${dividerAccent} via-transparent to-transparent`} />

      <AeCardContent className="p-4 md:p-5">
        {/* Header */}
        <div className="mb-3 flex flex-col gap-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl border bg-muted/30 text-xl shadow-sm">
                {txConfig.icon}
              </div>
              <div>
                <div className="text-base md:text-lg font-semibold leading-tight text-foreground">
                  {txConfig.label}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">{txConfig.description}</div>
              </div>
            </div>

            <Badge
              className={[
                'border px-2.5 py-1 rounded-full hidden md:block',
                'shadow-sm',
                txConfig.color,
                txConfig.chip,
              ].join(' ')}
            >
              {transaction.tx_type}
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground" title={formattedExactTime}>
            <Clock className="h-3.5 w-3.5" />
            <span>{formatTimestamp(transaction.created_at)}</span>
          </div>
        </div>

        {/* Swap section */}
        {hasSwapInfo && (
          <div className="mb-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 md:p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="text-lg">🔄</span>
              <span className="text-sm font-semibold text-blue-600">{t('transactions.swapDetails')}</span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('transactions.input')}</div>
                {transaction.swap_info.amount0In !== '0' && (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                    <span className="font-medium text-emerald-700">
                      {formatTokenAmount(transaction.swap_info.amount0In, transaction.pair.token0.decimals)}
                    </span>
                    <span className="text-xs text-muted-foreground">{transaction.pair.token0.symbol}</span>
                  </div>
                )}
                {transaction.swap_info.amount1In !== '0' && (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
                    <span className="font-medium text-emerald-700">
                      {formatTokenAmount(transaction.swap_info.amount1In, transaction.pair.token1.decimals)}
                    </span>
                    <span className="text-xs text-muted-foreground">{transaction.pair.token1.symbol}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{t('transactions.output')}</div>
                {transaction.swap_info.amount0Out !== '0' && (
                  <div className="flex items-center justify-between rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2">
                    <span className="font-medium text-blue-700">
                      {formatTokenAmount(transaction.swap_info.amount0Out, transaction.pair.token0.decimals)}
                    </span>
                    <span className="text-xs text-muted-foreground">{transaction.pair.token0.symbol}</span>
                  </div>
                )}
                {transaction.swap_info.amount1Out !== '0' && (
                  <div className="flex items-center justify-between rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2">
                    <span className="font-medium text-blue-700">
                      {formatTokenAmount(transaction.swap_info.amount1Out, transaction.pair.token1.decimals)}
                    </span>
                    <span className="text-xs text-muted-foreground">{transaction.pair.token1.symbol}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mint section */}
        {transaction.pair_mint_info && (
          <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center gap-2 px-4 pt-4">
              <span className="text-lg">🪙</span>
              <span className="text-sm font-semibold text-amber-600">{t('transactions.pairMint')}</span>
            </div>
            <div className="space-y-3 p-4 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t('transactions.type')}</span>
                <Badge className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-700">
                  {transaction.pair_mint_info.type}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-background/40 p-3 text-center">
                  <div className="font-mono text-lg font-semibold text-foreground">
                    {formatTokenAmount(transaction.pair_mint_info.amount0, transaction.pair.token0.decimals)}
                  </div>
                  <div className="text-xs text-muted-foreground">{transaction.pair.token0.symbol} {t('transactions.amount')}</div>
                </div>
                <div className="rounded-lg bg-background/40 p-3 text-center">
                  <div className="font-mono text-lg font-semibold text-foreground">
                    {formatTokenAmount(transaction.pair_mint_info.amount1, transaction.pair.token1.decimals)}
                  </div>
                  <div className="text-xs text-muted-foreground">{transaction.pair.token1.symbol} {t('transactions.amount')}</div>
                </div>
              </div>
            </div>
          </div>
        )}


        {/* Footer */}
        <div className="mt-4 rounded-xl border border-border/60 bg-gradient-to-r from-slate-500/5 to-gray-500/5 p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <CopyPill
                text={transaction.tx_hash}
                label={`📋 ${transaction.tx_hash.slice(0, 6)}...${transaction.tx_hash.slice(-4)}`}
              />
              <CopyPill
                text={transaction.pair.address}
                label={`🏊 ${transaction.pair.address.slice(0, 6)}...${transaction.pair.address.slice(-4)}`}
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeNetwork?.explorerUrl) {
                  window.open(`${activeNetwork.explorerUrl}/transactions/${transaction.tx_hash}`, '_blank');
                }
              }}
              className="h-4 gap-1 px-4 text-xs transition-colors hover:border-black/40 hover:bg-black/10"
              aria-label={t('transactions.openInExplorer')}
            >
              <ExternalLink className="h-2.5 w-3.5" />
              aescan
            </Button>
          </div>
        </div>
      </AeCardContent>
    </AeCard>
  );
};
