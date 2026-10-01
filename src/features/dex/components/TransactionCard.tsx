import { PairTransactionDto } from '@/api/generated/models/PairTransactionDto';
import { Button } from '@/components/ui/button';
import { useAeSdk } from '@/hooks';
import { Decimal } from '@/libs/decimal';
import {
  ArrowLeftRight, ArrowRight, ChevronDown, Clock, Copy, ExternalLink, Minus, Plus,
} from 'lucide-react';
import moment from 'moment';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import './TransactionCard.scss';

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
const CopyPill: React.FC<{
  text: string;
  icon?: React.ReactNode;
  label: string;
  className?: string;
}> = ({
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
        } catch {
          /* No-op */
        }
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
        description: t('transactions.genericDescription'),
      };
    }

    // Map tx_type to translation keys
    const translationKeyMap: Record<string, string> = {
      swap_exact_tokens_for_tokens: 'transactions.swapExactTokensForTokens',
      swap_exact_tokens_for_ae: 'transactions.swapExactTokensForAe',
      swap_exact_ae_for_tokens: 'transactions.swapExactAeForTokens',
      add_liquidity: 'transactions.addLiquidity',
      add_liquidity_ae: 'transactions.addLiquidityAe',
      remove_liquidity: 'transactions.removeLiquidity',
      remove_liquidity_ae: 'transactions.removeLiquidityAe',
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

  const hasSwapInfo = !!transaction.swap_info
    && (transaction.swap_info.amount0In !== '0'
      || transaction.swap_info.amount1In !== '0'
      || transaction.swap_info.amount0Out !== '0'
      || transaction.swap_info.amount1Out !== '0');

  const formatTimestamp = (iso: string) => {
    const date = new Date(iso);
    const now = moment();
    const diffDays = now.diff(date, 'days');
    return diffDays >= 1 ? moment(date).format('DD/MM/YYYY') : moment(date).fromNow();
  };

  const formattedExactTime = useMemo(
    () => moment(transaction.created_at).format('YYYY-MM-DD HH:mm:ss'),
    [transaction.created_at],
  );

  const formatTokenAmount = (amount: string, decimals: number) => Decimal
    .from(amount).div(10 ** decimals).prettify();

  const ActionIcon = isLiquidityTransaction ? Plus : ArrowLeftRight;

  return (
    <article className={`dex-transaction-card ${isLiquidityTransaction ? 'is-liquidity' : ''}`}>
      <div className="transaction-overview">
        <div className="transaction-identity">
          <span className="transaction-mark" aria-hidden="true">
            {transaction.tx_type.includes('remove') ? <Minus /> : <ActionIcon />}
          </span>
          <div>
            <h4>{txConfig.label}</h4>
            <p>{txConfig.description}</p>
          </div>
        </div>
        {hasSwapInfo && (
          <div className="transaction-amounts" aria-label={t('transactions.swapDetails')}>
            <div>
              <span>{t('transactions.input')}</span>
              {transaction.swap_info.amount0In !== '0' && (
                <strong>
                  {formatTokenAmount(transaction.swap_info.amount0In, transaction.pair.token0.decimals)}
                  <small>{transaction.pair.token0.symbol}</small>
                </strong>
              )}
              {transaction.swap_info.amount1In !== '0' && (
                <strong>
                  {formatTokenAmount(transaction.swap_info.amount1In, transaction.pair.token1.decimals)}
                  <small>{transaction.pair.token1.symbol}</small>
                </strong>
              )}
            </div>
            <ArrowRight className="transaction-amount-divider" aria-hidden="true" />
            <div>
              <span>{t('transactions.output')}</span>
              {transaction.swap_info.amount0Out !== '0' && (
                <strong>
                  {formatTokenAmount(transaction.swap_info.amount0Out, transaction.pair.token0.decimals)}
                  <small>{transaction.pair.token0.symbol}</small>
                </strong>
              )}
              {transaction.swap_info.amount1Out !== '0' && (
                <strong>
                  {formatTokenAmount(transaction.swap_info.amount1Out, transaction.pair.token1.decimals)}
                  <small>{transaction.pair.token1.symbol}</small>
                </strong>
              )}
            </div>
          </div>
        )}
        {transaction.pair_mint_info && (
          <div className="transaction-amounts" aria-label={t('transactions.pairMint')}>
            <div>
              <span>
                {transaction.pair.token0.symbol}
                {' '}
                {t('transactions.amount')}
              </span>
              <strong>
                {formatTokenAmount(transaction.pair_mint_info.amount0, transaction.pair.token0.decimals)}
                <small>{transaction.pair.token0.symbol}</small>
              </strong>
            </div>
            <Plus className="transaction-amount-divider" aria-hidden="true" />
            <div>
              <span>
                {transaction.pair.token1.symbol}
                {' '}
                {t('transactions.amount')}
              </span>
              <strong>
                {formatTokenAmount(transaction.pair_mint_info.amount1, transaction.pair.token1.decimals)}
                <small>{transaction.pair.token1.symbol}</small>
              </strong>
            </div>
          </div>
        )}
        <time className="transaction-time" dateTime={transaction.created_at} title={formattedExactTime}>
          <Clock aria-hidden="true" />
          {formatTimestamp(transaction.created_at)}
        </time>
      </div>
      <details className="transaction-details">
        <summary>
          <span>
            {t('transactions.type')}
            <small>{transaction.tx_type}</small>
          </span>
          <ChevronDown aria-hidden="true" />
        </summary>
        <div className="transaction-detail-content">
          {transaction.pair_mint_info && <span className="transaction-method">{transaction.pair_mint_info.type}</span>}
          <time dateTime={transaction.created_at}>{formattedExactTime}</time>
          <div className="transaction-copy-actions">
            <CopyPill
              text={transaction.tx_hash}
              label={`${transaction.tx_hash.slice(0, 6)}...${transaction.tx_hash.slice(-4)}`}
            />
            <CopyPill
              text={transaction.pair.address}
              label={`${transaction.pair.address.slice(0, 6)}...${transaction.pair.address.slice(-4)}`}
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
            className="transaction-explorer"
            aria-label={t('transactions.openInExplorer')}
          >
            <ExternalLink aria-hidden="true" />
            aescan
          </Button>
        </div>
      </details>
    </article>
  );
};
