import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, ArrowLeftRight, Check, Copy,
  Droplets, ListFilter, RotateCcw, Waves,
} from 'lucide-react';
import type { DexTokenDto } from '@/api/generated';
import { useCurrencies } from '@/hooks/useCurrencies';
import { Decimal } from '@/libs/decimal';
import SymbolPriceFormatter from '@/features/shared/components/SymbolPriceFormatter';
import FiatPriceFormatter from '@/features/shared/components/FiatPriceFormatter';
import './DexTokenHeader.scss';

interface Props {
  address: string;
  token?: DexTokenDto;
  loading?: boolean;
  failed?: boolean;
  onRetry: () => void;
}

const DexTokenHeader = ({
  address, token, loading = false, failed = false, onRetry,
}: Props) => {
  const { t } = useTranslation();
  const { currentCurrencyCode, currentCurrencyInfo, currentCurrencyRate } = useCurrencies();
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => { setCopyState('idle'); }, [address]);
  useEffect(() => {
    if (copyState !== 'copied') return undefined;
    const timeout = window.setTimeout(() => setCopyState('idle'), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyState]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopyState('copied');
    } catch { setCopyState('failed'); }
  };
  const aePrice = token?.price?.ae;
  const hasPrice = aePrice != null && Number.isFinite(Number(aePrice));
  const directFiat = token?.price?.[currentCurrencyCode];
  const fiat = directFiat ?? (hasPrice && currentCurrencyRate > 0
    ? Number(aePrice) * currentCurrencyRate : null);
  const change = token?.summary?.change?.['24h']?.percentage;
  const hasChange = change != null && Number.isFinite(Number(change));
  const query = `from=AE&to=${encodeURIComponent(address)}`;
  const tokenQuery = `tokenAddress=${encodeURIComponent(address)}`;
  return (
    <div className="dex-token-header">
      <div className="token-breadcrumb">
        <Link to="/defi/explore/tokens">
          <ArrowLeft aria-hidden="true" />
          {t('dex.tokenHeader.back')}
        </Link>
        <span>
          æternity
          <i aria-hidden="true" />
          AEX-9
        </span>
      </div>
      {loading || failed || !token ? (
        <section className="token-summary token-state" aria-busy={loading}>
          <h1>{t(loading ? 'common.views.tokenDetail.loadingTokenDetails' : 'dex.tokenHeader.failed')}</h1>
          {!loading && (
          <>
            <code dir="ltr">{address}</code>
            <button type="button" className="token-secondary" onClick={onRetry}>
              <RotateCcw aria-hidden="true" />
              {t('dex.tokenHeader.retry')}
            </button>
          </>
          )}
        </section>
      ) : (
        <section className="token-summary" aria-labelledby="dex-token-name">
          <div className="token-summary-top">
            <div className="token-identity">
              <div className="token-monogram" aria-hidden="true">{token.symbol?.slice(0, 1) || '#'}</div>
              <div>
                <div className="token-identity-title">
                  <h1 id="dex-token-name">{token.symbol}</h1>
                  <span>{t('dex.tokenHeader.token')}</span>
                </div>
                <p>{token.name}</p>
              </div>
            </div>
            <div className="token-quote">
              <span className="token-quote-label">{t('dex.tokenHeader.pricePer', { symbol: token.symbol })}</span>
              {hasPrice ? (
                <>
                  <SymbolPriceFormatter aePrice={Decimal.from(aePrice)} className="token-quote-value" />
                  <div className="token-quote-meta">
                    {fiat != null && Number.isFinite(Number(fiat)) && (
                    <span className="token-fiat">
                      ≈
                      <FiatPriceFormatter fiatPrice={Decimal.from(fiat)} currencySymbol={currentCurrencyInfo.symbol} />
                    </span>
                    )}
                    {hasChange && (
                    <span className={`token-change ${Number(change) < 0 ? 'is-negative' : ''}`}>
                      {Number(change) >= 0 ? '+' : ''}
                      {Decimal.from(change).prettify(2)}
                      %
                      <small>24h</small>
                    </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <strong className="token-no-price">{t('dex.tokenHeader.noPrice')}</strong>
                  <span className="token-price-hint">{t('dex.tokenHeader.noPriceHint')}</span>
                </>
              )}
            </div>
          </div>
          <div className="token-contract">
            <div>
              <span>{t('dex.tokenHeader.contract')}</span>
              <code dir="ltr">{address}</code>
            </div>
            <button type="button" aria-label={t(copyState === 'copied' ? 'dex.tokenHeader.copied' : 'dex.tokenHeader.copy')} onClick={copy}>{copyState === 'copied' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}</button>
            <span className="sr-only" role="status">{copyState !== 'idle' && t(copyState === 'copied' ? 'dex.tokenHeader.copied' : 'dex.tokenHeader.copyFailed')}</span>
          </div>
          <nav className="token-actions" aria-label={t('dex.tokenHeader.actions')}>
            <Link className="token-primary" to={`/defi/swap?${query}`}>
              <ArrowLeftRight aria-hidden="true" />
              {t('dex.swapButton')}
              <ArrowUpRight aria-hidden="true" />
            </Link>
            <Link className="token-secondary" to={`/defi/pool?${query}`}>
              <Droplets aria-hidden="true" />
              {t('dex.addLiquidityForm.addLiquidityButton')}
            </Link>
            <Link className="token-secondary" to={`/defi/explore/pools?${tokenQuery}`}>
              <Waves aria-hidden="true" />
              {t('dex.tokenHeader.pools')}
              {' '}
              <span className="token-action-count">{token.pairs_count ?? '—'}</span>
            </Link>
            <Link className="token-tertiary" to={`/defi/explore/transactions?${tokenQuery}`}>
              <ListFilter aria-hidden="true" />
              {t('explore.transactions')}
              <ArrowRight aria-hidden="true" />
            </Link>
          </nav>
        </section>
      )}
    </div>
  );
};
export default DexTokenHeader;
