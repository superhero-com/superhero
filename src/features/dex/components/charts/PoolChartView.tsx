import {
  useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
} from 'react';
import {
  createChart, ColorType, CandlestickSeries, LineSeries, HistogramSeries, CrosshairMode,
  type IChartApi, type ISeriesApi,
} from 'lightweight-charts';
import {
  ArrowDownUp, ChartCandlestick, ChartNoAxesCombined, ChevronLeft, ChevronRight,
  RotateCcw, RefreshCw, ChartLine,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DexTokenDto } from '@/api/generated';
import { TradingViewAttribution } from '@/components/charts/TradingViewAttribution';
import {
  candleChange, formatChartValue, TOKEN_CHART_INTERVALS, type TokenCandle,
} from '@/components/charts/tokenChartData';
import aeMark from '@/svg/aeternity-mark.svg';
import { isAeAsset, poolAssetSymbol } from './poolChartData';
import './PoolChartView.css';

interface Props {
  candles: TokenCandle[];
  asset?: DexTokenDto;
  denomination?: DexTokenDto;
  volumeSymbol: string;
  interval: number;
  onIntervalChange: (value: number) => void;
  onFlip: () => void;
  canFlip: boolean;
  loading: boolean;
  error: boolean;
  fetching: boolean;
  onRefresh: () => void;
  hasOlder: boolean;
  onLoadOlder: () => void;
  height?: number;
  className?: string;
}

const PoolChartView = ({
  candles, asset, denomination, volumeSymbol, interval, onIntervalChange, onFlip, canFlip,
  loading, error, fetching, onRefresh, hasOlder, onLoadOlder, height = 208, className = '',
}: Props) => {
  const { t, i18n } = useTranslation('dex');
  const [mode, setMode] = useState<'candles' | 'line'>('candles');
  const [volume, setVolume] = useState(true);
  const [selectedTime, setSelectedTime] = useState<number | null>(null);
  const [themeRevision, setThemeRevision] = useState(0);
  const volumeId = useId();
  const plot = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<'Candlestick'> | ISeriesApi<'Line'> | null>(null);
  const histogram = useRef<ISeriesApi<'Histogram'> | null>(null);
  const pagination = useRef({
    hasOlder, onLoadOlder, fetching, error,
  });
  pagination.current = {
    hasOlder, onLoadOlder, fetching, error,
  };
  const fitted = useRef(false);
  const base = poolAssetSymbol(asset);
  const quote = poolAssetSymbol(denomination);
  const current = candles.find((candle) => candle.time === selectedTime) || candles.at(-1);
  const selected = !!current && current.time === selectedTime;
  const change = candleChange(current);
  const intervalLabel = TOKEN_CHART_INTERVALS.find((item) => item.value === interval)?.label || '';
  const dateFormatter = useMemo(() => new Intl.DateTimeFormat(i18n.language, {
    timeZone: 'UTC', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }), [i18n.language]);
  const ready = candles.length > 0;
  let status = loading ? 'loading' : 'empty';
  if (error) status = 'error';
  let changeClass = '';
  if (change != null) changeClass = change >= 0 ? 'is-positive' : 'is-negative';
  useEffect(() => {
    const observer = new MutationObserver(() => setThemeRevision((value) => value + 1));
    observer.observe(document.documentElement, {
      attributes: true, attributeFilter: ['class', 'style', 'data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (!plot.current) return undefined;
    const css = getComputedStyle(plot.current);
    const color = (name: string) => css.getPropertyValue(`--pc-${name}`).trim();
    const api = createChart(plot.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: color('canvas') },
        textColor: color('axis'),
        fontSize: 10,
        fontFamily: 'Inter, system-ui, sans-serif',
        attributionLogo: false,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: color('grid') } },
      rightPriceScale: { borderVisible: false, minimumWidth: 70 },
      timeScale: {
        borderVisible: false,
        timeVisible: interval < 86400,
        secondsVisible: false,
        rightOffset: 4,
        minBarSpacing: 4,
      },
      localization: { timeFormatter: (time: number) => `${dateFormatter.format(time * 1000)} UTC` },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#617da766', labelBackgroundColor: '#253751' },
        horzLine: { color: '#617da766', labelBackgroundColor: '#253751' },
      },
      handleScroll: { vertTouchDrag: false },
    });
    const priceFormat = { type: 'custom' as const, minMove: 1e-12, formatter: formatChartValue };
    const priceSeries = mode === 'candles' ? api.addSeries(CandlestickSeries, {
      upColor: color('up'),
      downColor: color('down'),
      wickUpColor: color('up'),
      wickDownColor: color('down'),
      borderVisible: false,
      priceLineColor: color('up'),
      priceFormat,
    }) : api.addSeries(LineSeries, {
      color: color('series'), lineWidth: 2, priceLineColor: color('series'), priceFormat,
    });
    const volumeSeries = api.addSeries(HistogramSeries, {
      priceScaleId: 'volume',
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.84, bottom: 0 } });
    const crosshair = (event: { time?: unknown }) => {
      setSelectedTime(typeof event.time === 'number' ? event.time : null);
    };
    const loadOlder = () => {
      const state = pagination.current;
      if (!state.hasOlder || state.fetching || state.error || !priceSeries.data().length) return;
      const range = api.timeScale().getVisibleLogicalRange();
      if (range && (priceSeries.barsInLogicalRange(range)?.barsBefore ?? 100) < 10) {
        state.onLoadOlder();
      }
    };
    api.subscribeCrosshairMove(crosshair);
    api.timeScale().subscribeVisibleLogicalRangeChange(loadOlder);
    chart.current = api; series.current = priceSeries; histogram.current = volumeSeries;
    fitted.current = false;
    setSelectedTime(null);
    return () => {
      api.unsubscribeCrosshairMove(crosshair);
      api.timeScale().unsubscribeVisibleLogicalRangeChange(loadOlder);
      chart.current = null; series.current = null; histogram.current = null;
      api.remove();
    };
  }, [mode, interval, dateFormatter, themeRevision]);

  useEffect(() => {
    if (!chart.current || !series.current || !histogram.current || !plot.current) return;
    const css = getComputedStyle(plot.current);
    const up = css.getPropertyValue('--pc-up').trim();
    const down = css.getPropertyValue('--pc-down').trim();
    const firstTime = series.current.data()[0]?.time;
    const range = chart.current.timeScale().getVisibleLogicalRange();
    const smallest = candles.reduce((min, candle) => (
      Math.min(min, ...[candle.open, candle.low, candle.close].filter((value) => value > 0))
    ), Infinity);
    const minMove = Number.isFinite(smallest)
      ? 10 ** Math.max(-300, Math.min(0, Math.floor(Math.log10(smallest)) - 5)) : 1e-8;
    series.current.applyOptions({
      priceFormat: { type: 'custom', minMove, formatter: formatChartValue },
    });
    if (mode === 'candles') (series.current as ISeriesApi<'Candlestick'>).setData(candles);
    else (series.current as ISeriesApi<'Line'>).setData(candles.map((c) => ({ time: c.time, value: c.close })));
    histogram.current.setData(candles.filter((c) => c.volume !== null).map((c) => ({
      time: c.time, value: c.volume!, color: `${c.close >= c.open ? up : down}38`,
    })));
    if (candles.length && !fitted.current) {
      chart.current.timeScale().setVisibleLogicalRange({
        from: Math.max(0, candles.length - 80), to: candles.length + 3,
      });
      fitted.current = true;
    } else if (firstTime && range) {
      const offset = candles.findIndex((c) => c.time === firstTime);
      if (offset > 0) {
        chart.current.timeScale().setVisibleLogicalRange({
          from: range.from + offset, to: range.to + offset,
        });
      }
    }
  }, [candles, mode, interval, dateFormatter, themeRevision]);

  useEffect(() => {
    histogram.current?.applyOptions({ visible: volume });
    series.current?.priceScale().applyOptions({
      scaleMargins: { top: 0.1, bottom: volume ? 0.23 : 0.08 },
    });
  }, [volume, mode, interval, dateFormatter, themeRevision]);

  const reset = () => {
    chart.current?.timeScale().fitContent(); chart.current?.clearCrosshairPosition();
    setSelectedTime(null);
  };
  const inspect = (delta: number) => {
    const index = selected ? candles.findIndex((c) => c.time === selectedTime) : candles.length - 1;
    const candle = candles[Math.min(candles.length - 1, Math.max(0, index + delta))];
    if (!candle || !series.current) return;
    chart.current?.setCrosshairPosition(candle.close, candle.time, series.current);
    setSelectedTime(candle.time);
  };
  const assetName = isAeAsset(asset) ? 'æternity' : asset?.name || base;
  return (
    <section className={`pool-chart ${className}`} aria-label={t('poolChart.title', { base, quote })}>
      <header className="pool-chart-pair">
        <div className="pool-chart-identity">
          <span className="pool-chart-symbols" aria-hidden="true">
            {[asset, denomination].map((token, index) => (
              <span key={token?.address || index}>{isAeAsset(token) ? <img src={aeMark} alt="" /> : poolAssetSymbol(token).slice(0, 1)}</span>
            ))}
          </span>
          <div>
            <h2>
              <bdi>
                {base}
                <span> / </span>
                {quote}
              </bdi>
            </h2>
            <p>
              {assetName}
              <span>·</span>
              æternity
            </p>
          </div>
        </div>
        <button type="button" className="pool-chart-icon" aria-label={t('poolChart.reset')} title={t('poolChart.reset')} onClick={reset} disabled={!ready}><RotateCcw aria-hidden="true" /></button>
      </header>
      <div className="pool-chart-reading">
        <div>
          <strong><bdi>{formatChartValue(current?.close)}</bdi></strong>
          <span>
            <bdi>{quote}</bdi>
            {' '}
            <small>{t('poolChart.per', { base })}</small>
          </span>
        </div>
        <div className="pool-chart-change">
          <b className={changeClass}><bdi>{change == null ? '—' : `${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(2)}%`}</bdi></b>
          <small>{ready ? t(selected ? 'poolChart.selected' : 'poolChart.latest', { interval: intervalLabel }) : '—'}</small>
        </div>
      </div>
      <div className="pool-chart-toolbar">
        <div className="pool-chart-intervals" role="group" aria-label={t('poolChart.interval')} dir="ltr">
          {TOKEN_CHART_INTERVALS.map((item) => <button type="button" key={item.value} aria-pressed={interval === item.value} onClick={() => onIntervalChange(item.value)}>{item.label}</button>)}
        </div>
        <div className="pool-chart-types" role="group" aria-label={t('poolChart.style')}>
          <button type="button" aria-label={t('poolChart.candles')} title={t('poolChart.candles')} aria-pressed={mode === 'candles'} onClick={() => setMode('candles')}><ChartCandlestick aria-hidden="true" /></button>
          <button type="button" aria-label={t('poolChart.line')} title={t('poolChart.line')} aria-pressed={mode === 'line'} onClick={() => setMode('line')}><ChartNoAxesCombined aria-hidden="true" /></button>
        </div>
      </div>
      <div className="pool-chart-ohlc" dir="ltr">
        {(['open', 'high', 'low', 'close'] as const).map((key) => (
          <span key={key} title={t(`poolChart.${key}`)}>
            {key[0].toUpperCase()}
            {' '}
            <b>{formatChartValue(current?.[key])}</b>
          </span>
        ))}
      </div>
      <div className="pool-chart-plot-wrap">
        <div className="pool-chart-plot" ref={plot} style={{ height }} role="img" dir="ltr" aria-label={t('poolChart.description', { base, quote, interval: intervalLabel })} />
        {!ready && (
        <div className="pool-chart-state" role="status">
          <ChartLine aria-hidden="true" />
          <h3>{t(`poolChart.${status}`)}</h3>
          <p>{t(`poolChart.${status}Hint`)}</p>
          {status === 'error' && <button type="button" onClick={onRefresh} disabled={fetching}>{t('poolChart.retry')}</button>}
        </div>
        )}
      </div>
      <div className="pool-chart-selection">
        <time dateTime={current ? new Date(current.time * 1000).toISOString() : undefined}>{current ? `${dateFormatter.format(current.time * 1000)} UTC` : '—'}</time>
        <div>
          <button type="button" aria-label={t('poolChart.previous')} title={t('poolChart.previous')} disabled={!ready || current?.time === candles[0]?.time} onClick={() => inspect(-1)}><ChevronLeft aria-hidden="true" /></button>
          <button type="button" aria-label={t('poolChart.next')} title={t('poolChart.next')} disabled={!ready || current?.time === candles.at(-1)?.time} onClick={() => inspect(1)}><ChevronRight aria-hidden="true" /></button>
        </div>
        <span>{t('poolChart.inspect')}</span>
      </div>
      <footer className="pool-chart-footer">
        <label htmlFor={volumeId}>
          <input id={volumeId} type="checkbox" checked={volume} onChange={(e) => setVolume(e.target.checked)} />
          <span>{t('poolChart.volume')}</span>
          <b><bdi>{current?.volume == null ? '—' : `${formatChartValue(current.volume)} ${volumeSymbol}`}</bdi></b>
        </label>
        <div>
          <button type="button" className="pool-chart-unit" onClick={onFlip} disabled={!canFlip} aria-label={t('poolChart.flip')}>
            <span>{t('poolChart.units', { base, quote })}</span>
            <ArrowDownUp aria-hidden="true" />
          </button>
          <button type="button" className="pool-chart-icon" onClick={onRefresh} aria-label={t('poolChart.refresh')} title={t('poolChart.refresh')} disabled={fetching}><RefreshCw aria-hidden="true" className={fetching ? 'is-refreshing' : ''} /></button>
        </div>
      </footer>
      {error && ready && <p className="pool-chart-refresh-error" role="status">{t('poolChart.refreshError')}</p>}
      <div className="pool-chart-credit"><TradingViewAttribution /></div>
    </section>
  );
};
export default PoolChartView;
