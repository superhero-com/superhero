import {
  useEffect, useId, useRef, useState,
} from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowDown, ArrowLeft, ArrowUp, Check, ChevronDown, Hash, Share2,
} from 'lucide-react';
import { toAe } from '@aeternity/aepp-sdk';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import { useCurrencies } from '@/hooks/useCurrencies';
import { usePointerHighlight } from '@/hooks/usePointerHighlight';
import { Decimal } from '@/libs/decimal';
import { tokenCollectionLabel } from '@/utils/collection';
import { formatFractionalPrice } from '@/utils/common';
import PriceDataFormatter from '@/features/shared/components/PriceDataFormatter';
import FractionFormatter from '@/features/shared/components/FractionFormatter';
import './TokenOverview.css';

interface TokenOverviewProps {
  token?: Partial<TokenDto> | null;
  tokenName?: string;
  owned?: boolean;
  loading?: boolean;
  pending?: boolean;
  error?: boolean;
  onShare: () => void;
}

// Validate before Decimal conversion: absent/invalid values must not become zero.
const hasAmount = (value: unknown): value is string | number => (
  (typeof value === 'number' || typeof value === 'string')
  && String(value).trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 0
);

const OverviewAmount = ({ value, aettos = false }: {
  value: unknown; aettos?: boolean;
}) => {
  if (!hasAmount(value)) return <>—</>;
  const amount = Decimal.from(aettos ? toAe(value) : value);
  return (
    <bdi title={amount.prettifyWithMaxPrecision()}>
      {amount.isZero || amount.lt(Decimal.ONE)
        ? amount.prettifyWithMaxPrecision()
        : amount.prettify(2).replace(/\.00$/, '')}
    </bdi>
  );
};

const TokenDescription = ({ description }: { description: string }) => {
  const { t } = useTranslation('trending');
  const [expanded, setExpanded] = useState(false);
  const [clipped, setClipped] = useState(false);
  const probe = useRef<HTMLParagraphElement>(null);
  const id = useId();
  useEffect(() => {
    const element = probe.current;
    if (!element) return undefined;
    const measure = () => setClipped(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [description]);
  return (
    <div className="token-overview-description">
      <p id={id} className={expanded ? 'is-expanded' : ''}>{description}</p>
      <p ref={probe} aria-hidden="true" className="token-overview-description__probe">{description}</p>
      {clipped && (
        <button type="button" aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(!expanded)}>
          {t(expanded ? 'overview.less' : 'overview.more')}
          <ChevronDown aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

const TokenOverview = ({
  token, tokenName, owned = false, loading = false, pending = false, error = false, onShare,
}: TokenOverviewProps) => {
  const { t, i18n } = useTranslation('trending');
  const highlight = usePointerHighlight();
  const {
    currentCurrencyCode, currentCurrencyInfo, currentCurrencyRate, getFiat,
  } = useCurrencies();
  const name = token?.symbol || token?.name || tokenName || '—';
  const collection = tokenCollectionLabel(token);
  const price = token?.price_data?.ae;
  const validPrice = !pending && hasAmount(price);
  const directFiat = token?.price_data?.[currentCurrencyCode as keyof NonNullable<TokenDto['price_data']>];
  let fiat: Decimal | null = null;
  if (validPrice && hasAmount(directFiat)) fiat = Decimal.from(directFiat);
  else if (validPrice && currentCurrencyRate > 0) fiat = getFiat(Decimal.from(price));
  const period = token?.performance?.past_30d;
  const percent = period?.current_change_percent;
  const hasChange = !pending && percent != null && Number.isFinite(percent);
  const negative = period?.current_change_direction === 'down'
    || (period?.current_change_direction !== 'up' && (percent ?? 0) < 0);
  const rank = token?.rank;
  const description = !pending ? token?.metaInfo?.description : undefined;
  let notice = '';
  if (pending) notice = 'pending';
  else if (loading && !token?.sale_address) notice = 'loading';
  else if (error || !validPrice) notice = 'missing';

  return (
    <div className="token-overview-container" dir={i18n.dir()}>
      <Link className="token-overview-back" to="/trends/tokens">
        <ArrowLeft aria-hidden="true" />
        {t('overview.back')}
      </Link>
      <section className="token-overview" aria-label={name} aria-busy={notice === 'loading'} {...highlight}>
        <header className="token-overview-heading">
          <span className="token-overview-mark" aria-hidden="true"><Hash /></span>
          <div className="token-overview-identity">
            <h1 dir="auto">{name}</h1>
            <div className="token-overview-meta">
              <span>{t('overview.type')}</span>
              {collection && (
              <>
                <span aria-hidden="true">·</span>
                <span>{collection}</span>
              </>
              )}
              {!pending && rank != null && Number.isFinite(rank) && rank > 0 && (
                <span className="token-overview-rank">{t('overview.rank', { rank })}</span>
              )}
              {owned && (
              <span className="token-overview-owned">
                <Check aria-hidden="true" />
                {t('overview.owned')}
              </span>
              )}
            </div>
          </div>
          <button className="token-overview-share" type="button" onClick={onShare} aria-label={t('overview.shareToken', { name })}>
            <Share2 aria-hidden="true" />
            <span>{t('overview.share')}</span>
          </button>
        </header>
        {description && <TokenDescription key={`${name}:${description}`} description={description} />}
        <div className="token-overview-price">
          <div className="token-overview-price__label">{t('overview.price')}</div>
          <div className="token-overview-price__line">
            <div className="token-overview-price__value" dir="ltr">
              {validPrice ? (
                <PriceDataFormatter
                  priceData={token?.price_data}
                  hideFiatPrice
                  watchPrice={false}
                />
              ) : (
                <span>
                  —
                  <small>AE</small>
                </span>
              )}
            </div>
            {hasChange && (
              <span className={`token-overview-change${negative ? ' is-negative' : ''}${percent === 0 ? ' is-neutral' : ''}`}>
                {percent !== 0 && (negative ? <ArrowDown aria-hidden="true" /> : <ArrowUp aria-hidden="true" />)}
                <bdi>
                  {percent !== 0 && (negative ? '−' : '+')}
                  {Math.abs(percent).toFixed(2)}
                  %
                </bdi>
                <span>{t('overview.change')}</span>
              </span>
            )}
          </div>
          {fiat && (
            <div className="token-overview-fiat" dir="ltr">
              ≈
              {' '}
              {currentCurrencyInfo.symbol}
              <FractionFormatter fractionalPrice={formatFractionalPrice(fiat)} />
              {' '}
              {currentCurrencyCode.toUpperCase()}
            </div>
          )}
        </div>
        <dl className="token-overview-stats">
          <div>
            <dt>{t('overview.cap')}</dt>
            <dd>
              <OverviewAmount value={pending ? null : token?.market_cap_data?.ae} aettos />
              {' '}
              <span>AE</span>
            </dd>
          </div>
          <div>
            <dt>{t('overview.holders')}</dt>
            <dd>
              <OverviewAmount value={pending ? null : token?.holders_count} />
              {' '}
              <span>{t('overview.wallets')}</span>
            </dd>
          </div>
          <div>
            <dt>{t('overview.supply')}</dt>
            <dd>
              <OverviewAmount value={pending ? null : token?.total_supply} aettos />
              {' '}
              <span>{t('overview.tokens')}</span>
            </dd>
          </div>
        </dl>
        {notice && (
          <div className="token-overview-notice" role="status">
            <strong>{t(`overview.${notice}`)}</strong>
            {notice !== 'loading' && <p>{t(`overview.${notice}Copy`)}</p>}
          </div>
        )}
      </section>
    </div>
  );
};

export default TokenOverview;
