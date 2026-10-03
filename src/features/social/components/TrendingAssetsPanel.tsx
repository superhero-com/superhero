import {
  memo, useEffect, useId, useRef, useState,
} from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Hash, TrendingUp,
} from 'lucide-react';
import type { TokenDto } from '@/api/generated/models/TokenDto';
import { TokenLineChart } from '@/features/trending/components/TokenLineChart';
import { hasSparseHistory } from '@/features/trending/components/ExploreMarketValues';
import {
  formatAmount, holderCount, marketCap, tokenPrice,
} from '@/features/trending/components/TokenRanking/ranking';
import { usePointerHighlight } from '@/hooks/usePointerHighlight';
import { tokenCollectionLabel } from '@/utils/collection';
import './TrendingAssetsPanel.css';

const TrendingAssetCard = memo(({ token }: { token: TokenDto }) => {
  const { t, i18n } = useTranslation('social');
  const highlight = usePointerHighlight();
  const [failedChart, setFailedChart] = useState<string | null>(null);
  const label = token.symbol || token.name || token.address;
  const address = token.sale_address || token.address;
  const price = tokenPrice(token);
  const cap = marketCap(token);
  const holders = holderCount(token);
  const period = token.performance?.past_30d;
  const rawChange = period?.current_change_percent;
  const percent = rawChange == null || String(rawChange).trim() === ''
    ? NaN : Number(rawChange);
  const hasChange = Number.isFinite(percent);
  let direction = 'neutral';
  let sign = '';
  if (hasChange && percent !== 0) {
    direction = period?.current_change_direction === 'down' || percent < 0 ? 'down' : 'up';
    sign = direction === 'down' ? '−' : '+';
  }
  const formattedChange = Math.abs(percent) > 0 && Math.abs(percent) < 0.01
    ? '<0.01' : new Intl.NumberFormat(i18n.language, {
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(Math.abs(percent));
  const hasHistory = !!address && period?.current != null && failedChart !== address;

  return (
    <Link
      className="feed-asset"
      to={`/trends/tokens/${encodeURIComponent(token.name || token.address || label)}`}
      aria-label={t('common:aria.viewToken', { token: label })}
      {...highlight}
    >
      <div className="feed-asset__identity">
        <span className="feed-asset__mark"><Hash aria-hidden="true" /></span>
        <div>
          <h4 title={label}><bdi>{label}</bdi></h4>
          <span className="sr-only">{tokenCollectionLabel(token)}</span>
        </div>
        <ArrowUpRight className="feed-asset__open" aria-hidden="true" />
      </div>
      <div className="feed-asset__quote">
        <div className="feed-asset__price">
          <span className="sr-only">{t('trendingAssetCards.price')}</span>
          <strong dir="ltr" title={price == null ? undefined : `${price.toFixed()} AE`}>
            {formatAmount(price)}
            {' '}
            <small>AE</small>
          </strong>
        </div>
        <div className="feed-asset__performance">
          <strong className={`is-${direction}`} dir="ltr">
            {hasChange ? `${sign}${formattedChange}%` : '—'}
          </strong>
          <span title={t('trendingAssetCards.period')}>
            {t('trendingAssetCards.shortPeriod')}
          </span>
        </div>
      </div>
      {/* With only one or two trades the sparkline is a flat line or a lone bar,
          so the card collapses and the % change above carries the signal. */}
      {!hasSparseHistory(token) && (
        <div className="feed-asset__chart" onErrorCapture={() => setFailedChart(address)}>
          {hasHistory ? (
            <TokenLineChart saleAddress={address} height={32} width={240} interval="30d" />
          ) : <span>{t('trendingAssetCards.noHistory')}</span>}
        </div>
      )}
      <dl className="feed-asset__stats">
        <div>
          <dt>{t('trendingAssetCards.marketCap')}</dt>
          <dd dir="ltr" title={cap == null ? undefined : `${cap.toFixed()} AE`}>
            {formatAmount(cap, true)}
            {' '}
            <small>AE</small>
          </dd>
        </div>
        <div>
          <dt>{t('trendingAssetCards.holders')}</dt>
          <dd dir="ltr">{formatAmount(holders, true)}</dd>
        </div>
      </dl>
    </Link>
  );
});
TrendingAssetCard.displayName = 'TrendingAssetCard';

const TrendingAssetsPanel = ({ items, loading = false, byMarketCap = false }: {
  items: TokenDto[]; loading?: boolean; byMarketCap?: boolean;
}) => {
  const { t, i18n } = useTranslation('social');
  const track = useRef<HTMLDivElement>(null);
  const trackId = useId();
  const titleId = useId();
  const [scrollState, setScrollState] = useState({ previous: false, next: false });
  const rtl = i18n.dir() === 'rtl';

  useEffect(() => {
    const element = track.current;
    if (!element) return undefined;
    const measure = () => {
      const position = Math.abs(element.scrollLeft);
      setScrollState({
        previous: position > 2,
        next: position < element.scrollWidth - element.clientWidth - 2,
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.addEventListener('scroll', measure, { passive: true });
    measure();
    return () => {
      observer.disconnect();
      element.removeEventListener('scroll', measure);
    };
  }, [items.length, loading, rtl]);

  const scroll = (forward: boolean) => {
    const element = track.current;
    if (!element) return;
    const card = element.firstElementChild as HTMLElement | null;
    const step = (card?.offsetWidth ?? 244) + 12;
    const position = Math.abs(element.scrollLeft);
    const remaining = forward ? element.scrollWidth - element.clientWidth - position : position;
    const distance = remaining <= step + 12 ? remaining : step;
    element.scrollBy({
      left: distance * (forward ? 1 : -1) * (rtl ? -1 : 1),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  };

  return (
    <section
      className="feed-assets"
      dir={rtl ? 'rtl' : 'ltr'}
      aria-labelledby={titleId}
      aria-busy={loading}
    >
      <header className="feed-assets__header">
        <div className="feed-assets__heading">
          <TrendingUp aria-hidden="true" />
          <div>
            <h3 id={titleId}>{t(byMarketCap ? 'trendingAssetCards.marketLeaders' : 'trendingAssets')}</h3>
          </div>
        </div>
        <div className="feed-assets__actions">
          <Link to="/trends/tokens" className="feed-assets__all">
            {t('viewAll')}
            <ArrowRight aria-hidden="true" />
          </Link>
          {(scrollState.previous || scrollState.next) && (
            <div className="feed-assets__navigation">
              <button type="button" disabled={!scrollState.previous} onClick={() => scroll(false)} aria-label={t('trendingAssetCards.previous')} aria-controls={trackId}><ChevronLeft aria-hidden="true" /></button>
              <button type="button" disabled={!scrollState.next} onClick={() => scroll(true)} aria-label={t('trendingAssetCards.next')} aria-controls={trackId}><ChevronRight aria-hidden="true" /></button>
            </div>
          )}
        </div>
      </header>
      <div className="feed-assets__track" id={trackId} ref={track}>
        {loading ? Array.from({ length: 4 }, (_, index) => (
          <div className="feed-asset feed-asset--skeleton" key={index} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        )) : items.map((token) => (
          <TrendingAssetCard
            key={token.sale_address || token.address || token.name}
            token={token}
          />
        ))}
      </div>
      {loading && (
        <span role="status" className="sr-only">{t('trendingAssetCards.loading')}</span>
      )}
    </section>
  );
};

export default TrendingAssetsPanel;
