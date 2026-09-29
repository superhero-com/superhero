import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, ArrowRight, ArrowUpRight, ArrowLeftRight, Check, Copy,
  Droplets, ListFilter, RotateCcw,
} from 'lucide-react';
import type { PairDto } from '@/api/generated';
import { CONFIG } from '@/config';
import aeMark from '@/svg/aeternity-mark.svg';
import './DexTokenHeader.scss';
import './PoolHeader.scss';

interface PoolHeaderProps {
  address: string;
  pairData?: PairDto;
  loading?: boolean;
  failed?: boolean;
  onRetry: () => void;
}

export const PoolHeader = ({
  address, pairData, loading = false, failed = false, onRetry,
}: PoolHeaderProps) => {
  const { t } = useTranslation('dex');
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  useEffect(() => { setCopyState('idle'); }, [address]);
  useEffect(() => {
    if (copyState !== 'copied') return undefined;
    const timer = window.setTimeout(() => setCopyState('idle'), 1800);
    return () => window.clearTimeout(timer);
  }, [copyState]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopyState('copied');
    } catch { setCopyState('failed'); }
  };
  const tokens = pairData ? [pairData.token0, pairData.token1] : [];
  const query = pairData
    ? new URLSearchParams({ from: pairData.token0.address, to: pairData.token1.address }).toString() : '';
  return (
    <div className="dex-token-header dex-pool-header">
      <div className="token-breadcrumb">
        <Link to="/defi/explore/pools">
          <ArrowLeft aria-hidden="true" />
          {t('poolHeader.back')}
        </Link>
        <span>{t('poolHeader.overview')}</span>
      </div>
      {loading || failed || !pairData ? (
        <section className="token-summary token-state" aria-busy={loading} aria-live="polite">
          <h1>{t(loading ? 'poolHeader.loading' : 'poolHeader.failed')}</h1>
          {!loading && (
          <>
            <code dir="ltr">{address}</code>
            <button type="button" className="token-secondary" onClick={onRetry}>
              <RotateCcw aria-hidden="true" />
              {t('tokenHeader.retry')}
            </button>
          </>
          )}
        </section>
      ) : (
        <section className="token-summary" aria-labelledby="dex-pool-name">
          <div className="pool-summary-top">
            <div className="token-identity">
              <div className="pool-marks" aria-hidden="true">
                {tokens.map((token) => (
                  <span key={token.address}>
                    {token.address === CONFIG.DEX_WAE || token.is_ae
                      ? <img src={aeMark} alt="" /> : token.symbol?.slice(0, 1) || '#'}
                  </span>
                ))}
              </div>
              <div>
                <div className="token-identity-title">
                  <h1 id="dex-pool-name">
                    <bdi>{pairData.token0.symbol}</bdi>
                    {' '}
                    <i>/</i>
                    {' '}
                    <bdi>{pairData.token1.symbol}</bdi>
                  </h1>
                  <span>{t('poolHeader.liquidityPool')}</span>
                </div>
                <p>
                  <bdi>{pairData.token0.name}</bdi>
                  {' · '}
                  <bdi>{pairData.token1.name}</bdi>
                </p>
              </div>
            </div>
            <span className="pool-network">
              <i aria-hidden="true" />
              æternity
            </span>
          </div>
          <div className="pool-token-links">
            {tokens.map((token) => (
              <Link key={token.address} to={`/defi/explore/tokens/${encodeURIComponent(token.address)}`}>
                <bdi>{token.symbol}</bdi>
                {' '}
                <span>{t('poolHeader.viewTokenLabel')}</span>
                <ArrowUpRight aria-hidden="true" />
              </Link>
            ))}
          </div>
          <div className="token-contract">
            <div>
              <span>{t('poolHeader.contract')}</span>
              <code dir="ltr">{address}</code>
            </div>
            <button
              type="button"
              aria-label={t(copyState === 'copied' ? 'tokenHeader.copied' : 'poolHeader.copy')}
              onClick={copy}
            >
              {copyState === 'copied' ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            </button>
            <span className="sr-only" role="status">
              {copyState !== 'idle' && t(copyState === 'copied' ? 'tokenHeader.copied' : 'tokenHeader.copyFailed')}
            </span>
          </div>
          <nav className="token-actions" aria-label={t('poolHeader.actions')}>
            <Link className="token-primary" to={`/defi/pool?${query}`}>
              <Droplets aria-hidden="true" />
              {t('addLiquidityForm.title')}
              <ArrowUpRight aria-hidden="true" />
            </Link>
            <Link className="token-secondary" to={`/defi/swap?${query}`}>
              <ArrowLeftRight aria-hidden="true" />
              {t('poolHeader.swap')}
            </Link>
            <a className="token-tertiary" href="#pool-transactions">
              <ListFilter aria-hidden="true" />
              {t('poolHeader.transactions')}
              <ArrowRight aria-hidden="true" />
            </a>
          </nav>
        </section>
      )}
    </div>
  );
};
