import {
  useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import {
  CandlestickSeries, ColorType, createChart, CrosshairMode, HistogramSeries,
  type IChartApi, type ISeriesApi, type UTCTimestamp,
} from 'lightweight-charts';
import { useTranslation } from 'react-i18next';
import { ChartCandlestick, ChevronDown, RotateCcw } from 'lucide-react';
import { TradingViewAttribution } from './TradingViewAttribution';
import {
  candleChange, formatChartValue, TOKEN_CHART_INTERVALS, type TokenCandle,
} from './tokenChartData';
import './TokenChartView.css';

interface TokenChartViewProps {
  candles: TokenCandle[];
  symbol: string;
  interval: number;
  onIntervalChange: (value: number) => void;
  quote: string;
  fiatCode: string;
  fiat: boolean;
  onFiatChange: (value: boolean) => void;
  currentRateConversion?: boolean;
  loading: boolean;
  error: boolean;
  fetching: boolean;
  hasOlder: boolean;
  onLoadOlder: () => void;
  onRetry: () => void;
  height?: number;
  className?: string;
  noBackground?: boolean;
}

const TokenChartView = ({
  candles, symbol, interval, onIntervalChange, quote, fiatCode, fiat, onFiatChange,
  currentRateConversion = false, loading, error, fetching, hasOlder, onLoadOlder, onRetry,
  height = 318, className = '', noBackground = false,
}: TokenChartViewProps) => {
  const { t, i18n } = useTranslation('trending');
  const [details, setDetails] = useState(false);
  const [volume, setVolume] = useState(true);
  const [themeRevision, setThemeRevision] = useState(0);
  useEffect(() => {
    const observer = new MutationObserver(() => setThemeRevision((value) => value + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
    return () => observer.disconnect();
  }, []);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const plot = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const histogram = useRef<ISeriesApi<'Histogram'> | null>(null);
  const currentData = useRef(candles);
  currentData.current = candles;
  const pagination = useRef({
    fetching, hasOlder, error, onLoadOlder,
  });
  pagination.current = {
    fetching, hasOlder, error, onLoadOlder,
  };
  const fitDone = useRef(false);
  const detailsId = useId();
  const volumeId = useId();
  const current = candles.find((candle) => candle.time === selectedTime) || candles.at(-1);
  const change = candleChange(current);
  const currentInterval = TOKEN_CHART_INTERVALS.find((item) => item.value === interval)!;
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(i18n.language, {
    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }), [i18n.language]);

  useLayoutEffect(() => {
    const element = plot.current;
    if (!element) return undefined;
    const colors = () => {
      const styles = getComputedStyle(element);
      return {
        surface: styles.getPropertyValue('--chart-canvas').trim(),
        text: styles.getPropertyValue('--chart-axis').trim(),
        grid: styles.getPropertyValue('--chart-grid').trim(),
        up: styles.getPropertyValue('--chart-up').trim(),
        down: styles.getPropertyValue('--chart-down').trim(),
      };
    };
    const palette = colors();
    const instance = createChart(element, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: palette.surface },
        textColor: palette.text,
        fontSize: 10,
        fontFamily: 'Inter, system-ui, sans-serif',
        // The first-party TradingView link below satisfies attribution under Trusted Types.
        attributionLogo: false,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: palette.grid } },
      rightPriceScale: { borderVisible: false, minimumWidth: 85 },
      timeScale: {
        borderVisible: false,
        timeVisible: interval < 86400,
        secondsVisible: false,
        rightOffset: 5,
        minBarSpacing: 4,
      },
      localization: { timeFormatter: (time: number) => `${dateFormatter.format(time * 1000)} UTC` },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#7191be', labelBackgroundColor: '#263953' },
        horzLine: { color: '#7191be', labelBackgroundColor: '#263953' },
      },
      handleScroll: { vertTouchDrag: false },
    });
    const candleSeries = instance.addSeries(CandlestickSeries, {
      upColor: palette.up,
      downColor: palette.down,
      wickUpColor: palette.up,
      wickDownColor: palette.down,
      borderVisible: false,
      priceLineColor: '#7191be',
      priceFormat: { type: 'custom', minMove: 1e-12, formatter: formatChartValue },
    });
    const volumeSeries = instance.addSeries(HistogramSeries, {
      priceScaleId: 'volume',
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    const crosshair = (event: { time?: unknown }) => {
      setSelectedTime(typeof event.time === 'number' ? event.time : null);
    };
    const loadOlder = () => {
      const state = pagination.current;
      if (!currentData.current.length || state.fetching || !state.hasOlder || state.error) return;
      const range = instance.timeScale().getVisibleLogicalRange();
      if (range && (candleSeries.barsInLogicalRange(range)?.barsBefore ?? 100) < 10) {
        state.onLoadOlder();
      }
    };
    instance.subscribeCrosshairMove(crosshair);
    instance.timeScale().subscribeVisibleLogicalRangeChange(loadOlder);
    chart.current = instance;
    series.current = candleSeries;
    histogram.current = volumeSeries;
    fitDone.current = false;
    return () => {
      instance.unsubscribeCrosshairMove(crosshair);
      instance.timeScale().unsubscribeVisibleLogicalRangeChange(loadOlder);
      chart.current = null;
      series.current = null;
      histogram.current = null;
      instance.remove();
    };
  }, [interval, dateFormatter, themeRevision]);

  useEffect(() => {
    if (!chart.current || !series.current || !histogram.current || !plot.current) return;
    const styles = getComputedStyle(plot.current);
    const up = styles.getPropertyValue('--chart-up').trim();
    const down = styles.getPropertyValue('--chart-down').trim();
    const firstTime = series.current.data()[0]?.time;
    const range = chart.current.timeScale().getVisibleLogicalRange();
    const smallest = candles.reduce((minimum, candle) => {
      const prices = [candle.open, candle.low, candle.close].filter((value) => value > 0);
      return Math.min(minimum, ...prices);
    }, Infinity);
    const minMove = Number.isFinite(smallest)
      ? 10 ** Math.max(-300, Math.min(0, Math.floor(Math.log10(smallest)) - 5)) : 1e-8;
    series.current.applyOptions({
      priceFormat: { type: 'custom', minMove, formatter: formatChartValue },
    });
    series.current.setData(candles);
    histogram.current.setData(candles.filter((item) => item.volume !== null).map((item) => ({
      time: item.time, value: item.volume!, color: `${item.close >= item.open ? up : down}40`,
    })));
    if (candles.length && !fitDone.current) {
      chart.current.timeScale().setVisibleLogicalRange({
        from: Math.max(0, candles.length - 80), to: candles.length + 3,
      });
      fitDone.current = true;
    } else if (firstTime && range) {
      // Preserve the inspected date range when older pages prepend data.
      const offset = candles.findIndex((item) => item.time === firstTime);
      if (offset > 0) {
        chart.current.timeScale().setVisibleLogicalRange({
          from: range.from + offset, to: range.to + offset,
        });
      }
    }
  }, [candles, dateFormatter, themeRevision]);

  useEffect(() => {
    histogram.current?.applyOptions({ visible: volume });
    series.current?.priceScale().applyOptions({
      scaleMargins: { top: 0.12, bottom: volume ? 0.25 : 0.1 },
    });
  }, [volume, dateFormatter, themeRevision]);

  const reset = () => {
    chart.current?.timeScale().fitContent();
    chart.current?.clearCrosshairPosition();
    setSelectedTime(null);
  };
  const inspect = (step: number) => {
    const index = selectedTime === null ? candles.length - 1
      : candles.findIndex((candle) => candle.time === selectedTime);
    const candle = candles[Math.max(0, Math.min(candles.length - 1, index + step))];
    if (!candle || !series.current) return;
    chart.current?.setCrosshairPosition(candle.close, candle.time as UTCTimestamp, series.current);
    setSelectedTime(candle.time);
  };
  const hasData = candles.length > 0;
  let status = 'empty';
  if (error) status = 'error';
  else if (loading) status = 'loading';
  const detailsValues = current ? [
    ['open', current.open, quote], ['high', current.high, quote], ['low', current.low, quote],
    ['close', current.close, quote], ['volume', current.volume, t('chart.tokens')],
    ['cap', current.marketCap, quote],
  ] as const : [];

  return (
    <div className={`token-chart ${className}`} dir={i18n.dir()}>
      <section className={`chart-card${noBackground ? ' chart-card--bare' : ''}`} aria-label={t('chart.title')}>
        <header className="chart-heading">
          <div>
            <h2>{t('chart.title')}</h2>
            <p>
              {quote}
              {' '}
              ·
              {' '}
              {t('chart.per')}
            </p>
          </div>
          <div className="chart-heading-actions">
            <div className="chart-quote" role="group" aria-label={t('chart.quote')}>
              <button type="button" aria-pressed={!fiat} onClick={() => onFiatChange(false)}>AE</button>
              <button type="button" aria-pressed={fiat} onClick={() => onFiatChange(true)}>{fiatCode}</button>
            </div>
            <button className="chart-reset" type="button" onClick={reset} aria-label={t('chart.reset')} title={t('chart.reset')} disabled={!hasData}><RotateCcw aria-hidden="true" /></button>
          </div>
        </header>
        <div className="chart-toolbar">
          <div className="chart-intervals" role="group" aria-label={t('chart.interval')} dir="ltr">
            {TOKEN_CHART_INTERVALS.map((item) => (
              <button type="button" key={item.value} aria-pressed={interval === item.value} onClick={() => onIntervalChange(item.value)}>{item.label}</button>
            ))}
          </div>
          <span className="chart-interval-help">
            {t('chart.candle')}
            {' '}
            ·
            {' '}
            {t(`chart.${currentInterval.unit}`, { count: currentInterval.count })}
          </span>
        </div>
        {currentRateConversion && <p className="chart-rate-note">{t('chart.currentRate')}</p>}
        {current && (
          <div className="chart-reading">
            <div className="chart-reading__time">
              <span>{t(selectedTime === null ? 'chart.latest' : 'chart.selected')}</span>
              <time dateTime={new Date(current.time * 1000).toISOString()}>
                {dateFormatter.format(current.time * 1000)}
                {' '}
                UTC
              </time>
            </div>
            <div className="chart-reading__value">
              <strong dir="ltr">
                {formatChartValue(current.close)}
                {' '}
                <small>{quote}</small>
              </strong>
              {change !== null && (
              <span className={change >= 0 ? 'is-up' : 'is-down'} dir="ltr">
                {change > 0 && '+'}
                {change.toFixed(2)}
                %
              </span>
              )}
              <button type="button" className="chart-details-toggle" aria-expanded={details} aria-controls={detailsId} onClick={() => setDetails(!details)}>
                {t('chart.details')}
                <ChevronDown aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
        {hasData && details && (
          <dl id={detailsId} className="chart-detail-grid">
            {detailsValues.map(([label, value, unit]) => (
              <div key={label}>
                <dt>
                  {t(`chart.${label}`)}
                  {' '}
                  ·
                  {' '}
                  {unit}
                </dt>
                <dd dir="ltr">{formatChartValue(value)}</dd>
              </div>
            ))}
          </dl>
        )}
        <div className="chart-plot-wrap">
          <div className="chart-plot" style={{ height: Math.max(240, height) }} ref={plot} dir="ltr" role="img" aria-label={t('chart.description', { symbol, interval: currentInterval.label, quote })} />
          {!hasData && (
            <div className="chart-state" role="status">
              <ChartCandlestick aria-hidden="true" />
              <h3>{t(`chart.${status}`)}</h3>
              {status !== 'loading' && <p>{t(`chart.${status}Copy`)}</p>}
              {error && <button type="button" onClick={onRetry} disabled={fetching}>{t('chart.retry')}</button>}
            </div>
          )}
        </div>
        {hasData && error && (
        <div className="chart-refresh-error" role="status">
          {t('chart.refreshError')}
          <button type="button" onClick={onRetry} disabled={fetching}>{t('chart.retry')}</button>
        </div>
        )}
        <footer className="chart-footer">
          <div className="chart-footer-top">
            <label htmlFor={volumeId}>
              <input
                id={volumeId}
                type="checkbox"
                checked={volume}
                onChange={(event) => setVolume(event.target.checked)}
                aria-label={t('chart.volToggle')}
              />
              {t('chart.volume')}
              {' '}
              <span>
                ·
                {t('chart.tokens')}
              </span>
            </label>
            <div className="chart-footer-inspect">
              <button type="button" disabled={!hasData} onClick={() => inspect(-1)} aria-label={t('chart.previous')}>‹</button>
              <button type="button" disabled={!hasData} onClick={() => inspect(1)} aria-label={t('chart.next')}>›</button>
              <span>{t('chart.hint')}</span>
            </div>
          </div>
          <div className="chart-footer-bottom">
            <TradingViewAttribution />
            <span>{fetching && hasData ? t('chart.updating') : 'UTC'}</span>
          </div>
        </footer>
      </section>
    </div>
  );
};

export default TokenChartView;
