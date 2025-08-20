import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, ISeriesApi, CandlestickSeries } from 'lightweight-charts';

type Candle = { time: number; open: number; high: number; low: number; close: number; volume?: number };

type Props = {
  candles: Candle[];
  height?: number;
};

export default function TvCandles({ candles, height = 340 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      height,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#555' },
      rightPriceScale: { borderColor: 'rgba(0,0,0,0.1)' },
      timeScale: { borderColor: 'rgba(0,0,0,0.1)', rightOffset: 5, secondsVisible: true },
      grid: { horzLines: { color: 'rgba(0,0,0,0.05)' }, vertLines: { color: 'rgba(0,0,0,0.05)' } },
    });
    const series = chart.addSeries(CandlestickSeries, { upColor: '#32E56D', downColor: '#E84134', borderVisible: false, wickUpColor: '#32E56D', wickDownColor: '#E84134' });
    seriesRef.current = series;
    const onResize = () => chart.applyOptions({ width: el.clientWidth });
    onResize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.remove(); seriesRef.current = null; };
  }, [height]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    // Lightweight Charts expects unix (seconds), our data has ms; convert
    const data = (candles || []).map((c) => ({ time: Math.floor(c.time / 1000) as any, open: c.open, high: c.high, low: c.low, close: c.close }));
    if (data.length) series.setData(data);
  }, [candles]);

  return <div ref={containerRef} style={{ height }} />;
}


