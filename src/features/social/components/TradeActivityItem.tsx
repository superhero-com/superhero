import AddressAvatar from '@/components/AddressAvatar';
import { cn } from '@/lib/utils';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import PostHashtagLink from '@/components/social/PostHashtagLink';
import { Badge } from '@/components/ui/badge';
import { Plus, RefreshCw } from 'lucide-react';
import { useWallet } from '../../../hooks';
import { compactTime, fullTimestamp } from '../../../utils/time';
import { formatCompactNumber } from '../../../utils/number';
import { Decimal } from '../../../libs/decimal';
import { formatFractionalPrice } from '../../../utils/common';
import FractionFormatter from '../../shared/components/FractionFormatter';
import type { TokenDto } from '../../../api/generated/models/TokenDto';

export type TradeActivityItemData = {
  id: string;
  created_at: string;
  account?: string;
  address?: string;
  volume?: string;
  priceUsd?: number | string;
  tx_hash?: string;
  tx_type?: string;
  token?: TokenDto | null;
};

interface TradeActivityItemProps {
  item: TradeActivityItemData;
}

const TradeActivityItem = memo(({ item }: TradeActivityItemProps) => {
  const { t } = useTranslation('social');
  const navigate = useNavigate();
  const { chainNames, profileDisplayNames } = useWallet();
  const account = item.account || item.address || '';
  const displayName = profileDisplayNames?.[account] ?? chainNames?.[account] ?? t('common:defaultDisplayName');
  const tokenName = item?.token?.name || item?.token?.symbol || '';
  const tokenLabel = item?.token?.symbol || item?.token?.name || 'Token';
  const tokenTag = tokenName || tokenLabel;
  const tokenLink = tokenTag ? `/trends/tokens/${encodeURIComponent(tokenTag)}` : '';
  const copyTradeLink = tokenTag
    ? `/trends/tokens/${encodeURIComponent(tokenTag)}?trade=buy&amount=${encodeURIComponent(String(item?.volume || ''))}&showTrade=1`
    : '';

  const onOpen = useCallback(() => {
    if (tokenLink) navigate(tokenLink);
  }, [navigate, tokenLink]);

  const volumeText = useMemo(
    () => formatCompactNumber(item?.volume, 2, 2),
    [item?.volume],
  );
  const priceFraction = useMemo(() => {
    if (item?.priceUsd == null || item.priceUsd === '') return null;
    const value = Number(item.priceUsd);
    if (!Number.isFinite(value) || value === 0) return null;
    return formatFractionalPrice(Decimal.from(value));
  }, [item?.priceUsd]);

  return (
    <article
      // eslint-disable-next-line jsx-a11y/no-noninteractive-element-to-interactive-role
      role="button"
      tabIndex={0}
      className={cn(
        'relative w-full px-3 md:px-4 py-4 md:py-5 border-b border-white/10 bg-transparent transition-colors',
        'cursor-pointer hover:bg-white/[0.04]',
      )}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      aria-label={t('common:aria.openTrade')}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[24px] md:text-3xl font-semibold text-white truncate">
            {tokenTag ? (
              <PostHashtagLink tag={tokenTag} label={`#${tokenTag}`} variant="inline" />
            ) : (
              <span className="text-white">{tokenLabel}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-6 w-6 items-center justify-center rounded-full border border-sky-400/30 bg-sky-500/15 text-sky-200">
            <RefreshCw className="h-3.5 w-3.5" />
            <Plus className="absolute h-2.5 w-2.5" />
          </span>
          <Badge className="border-sky-400/30 bg-sky-500/20 text-sky-200 uppercase tracking-wide">
            Trade
          </Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
        <div className="flex w-full max-w-[280px] items-start gap-2.5 rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
          <div className="flex-shrink-0 pt-0.5">
            <div className="md:hidden">
              <AddressAvatar address={account} size={34} />
            </div>
            <div className="hidden md:block">
              <AddressAvatar address={account} size={40} />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 min-w-0">
              <div className="text-[15px] font-semibold text-white truncate">{displayName}</div>
              <span className="text-white/50 shrink-0">·</span>
              <div className="text-[12px] text-white/70 whitespace-nowrap shrink-0" title={fullTimestamp(item.created_at)}>
                {compactTime(item.created_at)}
              </div>
            </div>
            <div className="mt-1 text-[9px] md:text-[10px] text-white/65 font-mono leading-[1.2] truncate">{account}</div>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] text-foreground leading-snug flex flex-wrap items-center gap-1 md:mt-1">
            <span className="text-white/80">{t('bought')}</span>
            <span className="font-semibold text-white">{volumeText}</span>
            <span className="text-white/60">{t('of')}</span>
            {tokenTag ? (
              <PostHashtagLink tag={tokenTag} label={`#${tokenTag}`} variant="inline" />
            ) : (
              <span className="text-white/80">{tokenLabel}</span>
            )}
            {priceFraction && (
              <>
                <span className="text-white/60">{t('at')}</span>
                <span className="text-white/80 inline-flex items-center gap-0.5">
                  <span>$</span>
                  <FractionFormatter fractionalPrice={priceFraction} />
                  .
                </span>
              </>
            )}
          </div>
          {copyTradeLink && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(copyTradeLink);
                }}
                className="text-[13px] font-semibold text-sky-300 hover:text-sky-200 transition-colors"
                title={t('copyTrade')}
              >
                {t('copyTrade')}
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
});

TradeActivityItem.displayName = 'TradeActivityItem';

export default TradeActivityItem;
