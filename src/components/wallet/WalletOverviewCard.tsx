import React, {
  useEffect, useId, useMemo, useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';

import AddressAvatar from '@/components/AddressAvatar';
import { Separator } from '@/components/ui/separator';

import { useAeSdk } from '@/hooks/useAeSdk';
import { useAccountBalances } from '@/hooks/useAccountBalances';
import { useChainName } from '@/hooks/useChainName';
import { AccountTokensService } from '@/api/generated/services/AccountTokensService';
import { Decimal } from '@/libs/decimal';
import AePriceCard from './AePriceCard';

type Currency = 'usd' | 'eur' | 'cny';

type WalletOverviewCardProps = {
  selectedCurrency?: Currency;
  prices?: Record<string, number> | null;
  className?: string;
};

const formatPrice = (value: number, currency: string, maximumFractionDigits = 6): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits,
  });
  try {
    return formatter.format(value);
  } catch {
    return value.toFixed(2);
  }
};

const getTokenLabelSafe = (item: any): string => {
  try {
    const token = item?.token || {};
    const label = item?.token_symbol
      || item?.symbol
      || token?.symbol
      || item?.token_name
      || item?.name
      || token?.name
      || item?.address
      || token?.address;
    if (typeof label === 'string') return label;
    return 'Token';
  } catch {
    return 'Token';
  }
};

const getBalanceLabelSafe = (item: any): string => {
  try {
    const token = item?.token || item || {};
    const decimals = Number(token?.decimals ?? 18);
    const raw = item?.balance ?? item?.holder_balance ?? item?.amount ?? item?.token_balance;
    if (raw == null) return '-';
    return Decimal.from(raw).div(10 ** decimals).prettify();
  } catch {
    return '-';
  }
};

const WalletOverviewCard = ({
  selectedCurrency = 'usd',
  prices = null,
  className,
}: WalletOverviewCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { activeAccount, currentBlockHeight } = useAeSdk();
  const { decimalBalance } = useAccountBalances(activeAccount);
  const { chainName } = useChainName(activeAccount || '');
  const preferredName = (chainName || '').trim();
  const detailsId = useId();

  // Immediately reload balance when account changes
  // Note: loadAccountData is already called by useAccountBalances when selectedAccount changes
  // So we don't need to call it again here to avoid duplicate calls

  // Persisted expand/collapse state
  const [open, setOpen] = useState<boolean>(() => (typeof window !== 'undefined'
    ? localStorage.getItem('walletCard.open') === '1'
    : false));
  useEffect(() => {
    try {
      localStorage.setItem('walletCard.open', open ? '1' : '0');
    } catch {
      // Ignore persistence errors (e.g. private mode)
    }
  }, [open]);

  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

  const balanceAe = useMemo(() => Number(decimalBalance?.toString() || 0), [
    decimalBalance,
  ]);

  const aeFiat = useMemo(() => {
    if (!prices || prices[selectedCurrency] == null) return null;
    return balanceAe * Number(prices[selectedCurrency]);
  }, [prices, selectedCurrency, balanceAe]);

  // Top 3 holdings by balance from backend (fallbacks handled by caller later if needed)
  const { data: topHoldingsResp } = useQuery({
    queryKey: [
      'AccountTokensService.listTokenHolders-top3',
      activeAccount,
    ],
    queryFn: () => AccountTokensService.listTokenHolders({
      address: activeAccount,
      orderBy: 'balance' as any,
      orderDirection: 'DESC' as any,
      limit: 3,
    }) as unknown as Promise<{ items: any[]; meta?: any }>,
    enabled: !!activeAccount,
    staleTime: 60_000,
  });

  const topHoldings = useMemo(() => topHoldingsResp?.items ?? [], [
    topHoldingsResp,
  ]);

  if (!activeAccount) {
    const price = prices?.[selectedCurrency];
    return (
      <AePriceCard
        price={price != null && Number.isFinite(price) ? formatPrice(price, selectedCurrency) : '—'}
        currency={selectedCurrency}
        isOnline={isOnline}
        blockHeight={currentBlockHeight}
        className={className}
      />
    );
  }

  return (
    <div className={`min-w-0 ${className || ''}`}>
      {/* Summary Row */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="text-xs text-[var(--light-font-color)] uppercase tracking-wide flex items-center gap-1.5">
            <span className="text-base" aria-hidden="true">👛</span>
            <span>{t('common.wallet.yourWallet')}</span>
          </div>
          <div className="ms-auto flex max-w-full items-center gap-1">
            <button
              type="button"
              onClick={() => navigate(`/users/${activeAccount}`)}
              className="min-h-[30px] [@media(pointer:coarse)]:min-h-11 bg-white/5 border border-transparent rounded-lg px-2 py-1 text-[11px] cursor-pointer transition-colors hover:bg-white/10 hover:border-white/10 text-[var(--light-font-color)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {t('common.wallet.viewProfile')}
            </button>
            <button
              type="button"
              aria-label={open ? t('common.wallet.collapseWallet') : t('common.wallet.expandWallet')}
              aria-expanded={open}
              aria-controls={detailsId}
              className="flex shrink-0 items-center justify-center size-[30px] [@media(pointer:coarse)]:size-11 bg-white/5 border border-transparent rounded-lg cursor-pointer transition-colors hover:bg-white/10 hover:border-white/10 text-[var(--light-font-color)] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onClick={(e) => {
                e.stopPropagation();
                setOpen((v) => !v);
              }}
            >
              <ChevronDown className={`size-4 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
          </div>
        </div>

        <Link
          to={`/users/${activeAccount}`}
          className="flex min-w-0 items-start gap-2.5 rounded-sm no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <AddressAvatar address={activeAccount} size={36} className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className={`[overflow-wrap:anywhere] font-semibold leading-snug text-[var(--standard-font-color)] ${preferredName ? 'text-[15px]' : 'text-[13px]'}`} dir="auto">
              {preferredName || activeAccount}
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[13px] font-medium tabular-nums text-[var(--standard-font-color)]">
              <span className="[overflow-wrap:anywhere]" dir="ltr">
                {balanceAe.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                {' '}
                AE
              </span>
              {aeFiat != null && (
                <span className="text-xs font-normal text-[var(--light-font-color)] [overflow-wrap:anywhere]" dir="ltr">
                  ≈
                  {' '}
                  {formatPrice(aeFiat, selectedCurrency, 2)}
                </span>
              )}
            </div>
          </div>
        </Link>

        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2.5 text-[11px] tabular-nums text-[var(--light-font-color)]">
          <span className="flex items-center gap-1.5" role="status" aria-live="polite">
            <span
              className={`size-1.5 shrink-0 rounded-full ${
                isOnline
                  ? 'bg-[var(--neon-green)]'
                  : 'bg-[var(--neon-pink)]'
              }`}
              aria-hidden="true"
            />
            {isOnline ? t('common.wallet.online') : t('common.wallet.offline')}
          </span>
          {currentBlockHeight != null && (
            <span className="flex flex-wrap gap-x-1">
              <span>{t('common.wallet.block')}</span>
              <span dir="ltr">
                #
                {Number(currentBlockHeight).toLocaleString()}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {open && (
        <div id={detailsId} className="mt-3 border-t border-white/10 pt-3">
          <div className="mb-2.5 text-xs text-[var(--light-font-color)] [overflow-wrap:anywhere]" dir="ltr">
            {activeAccount}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="px-2 py-1.5 [@media(pointer:coarse)]:min-h-11 rounded-lg text-xs transition-colors bg-white/5 text-[var(--light-font-color)] hover:bg-white/10 hover:text-white border border-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(activeAccount);
                } catch {
                  // Ignore clipboard errors
                }
              }}
            >
              {t('common.wallet.copyAddress')}
            </button>
            <button
              type="button"
              className="px-2 py-1.5 [@media(pointer:coarse)]:min-h-11 rounded-lg text-xs transition-colors bg-white/5 text-[var(--light-font-color)] hover:bg-white/10 hover:text-white border border-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              onClick={() => window.open(`https://www.aescan.io/accounts/${activeAccount}`, '_blank')}
            >
              {t('common.wallet.openOnAescan')}
            </button>
          </div>

          <Separator className="my-3" />

          <div className="grid min-w-0 gap-2">
            <div className="text-xs text-white/70 font-medium">{t('explore:ownedTrends')}</div>
            {topHoldings.length === 0 ? (
              <div className="text-xs text-white/60">
                {t('common.wallet.noHoldings')}
              </div>
            ) : (
              <div className="flex min-w-0 flex-col gap-2">
                {topHoldings.map((it: any) => {
                  const label = getTokenLabelSafe(it);
                  const balanceLabel = getBalanceLabelSafe(it);
                  return (
                    <div key={`${label}-${balanceLabel}`} className="flex min-w-0 items-center justify-between gap-2 text-sm">
                      <div
                        className="min-w-0 flex-1 truncate font-bold bg-gradient-to-r from-orange-400 to-yellow-500 bg-clip-text text-transparent"
                        title={label}
                      >
                        <span className="text-white/60 text-[.85em] mr-0.5 align-baseline">#</span>
                        <span className="font-bold">{(label || '').toString()}</span>
                      </div>
                      <div className="max-w-[50%] shrink-0 text-end [overflow-wrap:anywhere] text-xs md:text-sm bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                        {balanceLabel}
                      </div>
                    </div>
                  );
                })}
                {(topHoldingsResp as any)?.meta?.totalItems > 3 && (
                  <button
                    type="button"
                    className="self-start mt-1 text-[11px] text-white/70 hover:text-white/90 hover:underline"
                    onClick={() => navigate(`/users/${activeAccount}?tab=owned`)}
                  >
                    {t('common.wallet.showMore')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletOverviewCard;
