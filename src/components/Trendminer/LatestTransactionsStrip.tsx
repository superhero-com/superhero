import {
  useCallback, useEffect, useId, useLayoutEffect, useRef, useState,
  type ReactNode,
} from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowDownRight, ArrowRightLeft, ArrowUpRight, ChevronLeft, ChevronRight, Sparkles,
} from 'lucide-react';
import { Decimal } from '@/libs/decimal';
import { TX_FUNCTIONS } from '@/utils/constants';
import { usePointerHighlight } from '@/hooks/usePointerHighlight';
import AddressAvatar from '../AddressAvatar';
import './LatestTransactionsCarousel.scss';

export interface ActivityTransaction {
  id?: string | number;
  tx_hash?: string;
  address?: string;
  account?: string;
  token?: { name?: string; sale_address?: string };
  token_name?: string;
  name?: string;
  symbol?: string;
  volume?: string | number;
  created_at?: string;
  type?: string;
  tx_type?: string;
  txType?: string;
  action?: string;
  function?: string;
  fn?: string;
}

const getAction = (item: ActivityTransaction) => {
  const type = (item.type || item.tx_type || item.txType || item.action
    || item.function || item.fn || '').toLowerCase();
  switch (type) {
    case TX_FUNCTIONS.buy: return { key: 'bought', tone: 'buy', Icon: ArrowUpRight };
    case TX_FUNCTIONS.sell: return { key: 'sold', tone: 'sell', Icon: ArrowDownRight };
    case TX_FUNCTIONS.create_community: return { key: 'created', tone: 'create', Icon: Sparkles };
    default: return { key: 'transaction', tone: 'neutral', Icon: ArrowRightLeft };
  }
};

const getKey = (item: ActivityTransaction) => item.id ?? item.tx_hash
  ?? [item.address || item.account, item.token?.name || item.token_name,
    item.created_at, item.tx_type || item.type, item.volume].join(':');

const ActivityCard = ({ item }: { item: ActivityTransaction }) => {
  const { t } = useTranslation('common', { keyPrefix: 'trendminer.latestTransactions' });
  const highlight = usePointerHighlight();
  const { key, tone, Icon } = getAction(item);
  const name = item.token?.name || item.token_name || item.name || item.symbol;
  const address = item.address || item.account || '';
  const actor = address ? `${address.slice(0, 7)}…${address.slice(-4)}` : t('unknownTrader');
  // Volume is a token quantity. An AE amount must never be used as its fallback.
  const volume = Number.isFinite(Number(item.volume)) && Number(item.volume) > 0
    ? Decimal.from(item.volume!).shorten() : null;
  const className = `latest-activity-card latest-activity-card--${tone}`;
  const title = [name || t('unknownToken'), t(key), actor,
    volume ? t('tokenQuantity', { amount: volume }) : null].filter(Boolean).join(' · ');
  const content = (
    <>
      <AddressAvatar address={address} size={30} />
      <span className="latest-activity-card__body">
        <span className="latest-activity-card__headline">
          <span className="latest-activity-card__name">
            <span className="latest-activity-card__hash" aria-hidden="true">#</span>
            <bdi>{name || t('unknownToken')}</bdi>
          </span>
          <span className="latest-activity-card__action">
            <Icon aria-hidden="true" />
            {t(key)}
          </span>
        </span>
        <span className="latest-activity-card__meta">
          <bdi className="latest-activity-card__address" dir="ltr">{actor}</bdi>
          {volume && (
            <span className="latest-activity-card__amount">
              <bdi>{volume}</bdi>
              {' '}
              <span>{t('tokens')}</span>
            </span>
          )}
        </span>
      </span>
    </>
  );
  return name ? (
    <Link
      to={`/trends/tokens/${encodeURIComponent(name)}`}
      className={className}
      title={title}
      aria-label={title}
      {...highlight}
    >
      {content}
    </Link>
  ) : <div className={className} title={title}>{content}</div>;
};

const LatestTransactionsStrip = ({ transactions, headerStart }: {
  transactions: ActivityTransaction[]; headerStart?: ReactNode;
}) => {
  const { t, i18n } = useTranslation('common', { keyPrefix: 'trendminer.latestTransactions' });
  const isRtl = i18n.dir() === 'rtl';
  const titleId = useId();
  const trackId = useId();
  const track = useRef<HTMLDivElement>(null);
  const resumeAt = useRef(0);
  const [displayed, setDisplayed] = useState(transactions);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touching, setTouching] = useState(false);
  const [manualBrowsing, setManualBrowsing] = useState(false);
  const [bounds, setBounds] = useState({ start: true, end: true });
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  const updateBounds = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const position = Math.max(0, isRtl ? -el.scrollLeft : el.scrollLeft);
    const start = position < 2;
    const end = position + el.clientWidth >= el.scrollWidth - 2;
    setBounds((previous) => (previous.start === start && previous.end === end
      ? previous : { start, end }));
  }, [isRtl]);

  // Hold the reading position and focused link during manual interaction.
  // Automatic browsing can continue receiving the latest subscription snapshot.
  useEffect(() => {
    if (!displayed.length || ((!manualBrowsing || bounds.start)
      && !hovered && !focused && !touching)) {
      if (transactions !== displayed && bounds.end && !manualBrowsing && track.current) {
        track.current.scrollLeft = 0;
      }
      setDisplayed(transactions);
    }
  }, [transactions, displayed, bounds.start, bounds.end,
    manualBrowsing, hovered, focused, touching]);

  useLayoutEffect(() => { updateBounds(); }, [displayed, updateBounds]);
  useEffect(() => {
    const el = track.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(updateBounds);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateBounds]);

  // Advance the native scroller without re-rendering every animation frame.
  // As before, automatic movement stops at the end of the available events.
  useEffect(() => {
    const el = track.current;
    if (!el || !displayed.length || hovered || focused || touching
      || reducedMotion || bounds.end) return undefined;
    let frame: number;
    let previousTime: number | undefined;
    const advance = (time: number) => {
      const elapsed = previousTime === undefined ? 0 : Math.min(time - previousTime, 100);
      previousTime = time;
      const limit = Math.max(0, el.scrollWidth - el.clientWidth);
      const position = Math.max(0, isRtl ? -el.scrollLeft : el.scrollLeft);
      if (time >= resumeAt.current) {
        if (manualBrowsing) setManualBrowsing(false);
        const next = Math.min(limit, position + (elapsed * 32) / 1000);
        el.scrollLeft = isRtl ? -next : next;
        if (next >= limit) {
          updateBounds();
          return;
        }
      }
      frame = window.requestAnimationFrame(advance);
    };
    frame = window.requestAnimationFrame(advance);
    return () => window.cancelAnimationFrame(frame);
  }, [displayed, hovered, focused, touching, manualBrowsing,
    reducedMotion, bounds.end, isRtl, updateBounds]);

  const delayAutomaticScroll = () => {
    setManualBrowsing(true);
    resumeAt.current = performance.now() + 4000;
  };

  const scroll = (direction: number) => {
    const el = track.current;
    if (!el) return;
    delayAutomaticScroll();
    el.scrollBy({
      left: direction * (isRtl ? -1 : 1) * Math.max(288, el.clientWidth * 0.85),
      behavior: reducedMotion ? 'instant' : 'smooth',
    });
  };

  return (
    <section
      className="latest-activity"
      dir={i18n.dir()}
      aria-labelledby={titleId}
      onPointerEnter={(event) => { if (event.pointerType !== 'touch') setHovered(true); }}
      onPointerLeave={() => setHovered(false)}
      onTouchStart={() => { setManualBrowsing(true); setTouching(true); }}
      onTouchEnd={() => { delayAutomaticScroll(); setTouching(false); }}
      onTouchCancel={() => { delayAutomaticScroll(); setTouching(false); }}
      onWheel={delayAutomaticScroll}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <div className="latest-activity__heading">
        <div className="latest-activity__title">
          {headerStart}
          <h2 id={titleId}>
            <span className="latest-activity__dot" aria-hidden="true" />
            {t('title')}
          </h2>
        </div>
        <div className="latest-activity__navigation">
          <span className="latest-activity__order">{t('newestFirst')}</span>
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label={t('newer')}
            aria-controls={trackId}
            disabled={bounds.start}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label={t('older')}
            aria-controls={trackId}
            disabled={bounds.end}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="latest-activity__track" id={trackId} ref={track} onScroll={updateBounds}>
        {displayed.length ? displayed.map((item) => (
          <ActivityCard key={getKey(item)} item={item} />
        )) : (
          <div className="latest-activity__loading" role="status" aria-label={t('loading')}>
            {[0, 1, 2, 3].map((key) => (
              <div key={key} className="latest-activity-card latest-activity-card--skeleton" aria-hidden="true">
                <span className="latest-activity__skeleton-avatar" />
                <span className="latest-activity-card__body">
                  <span className="latest-activity__skeleton-line" />
                  <span className="latest-activity__skeleton-line latest-activity__skeleton-line--short" />
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default LatestTransactionsStrip;
