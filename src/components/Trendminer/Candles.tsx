import React, { useEffect, useRef } from 'react';

type Candle = { time: number; open: number; high: number; low: number; close: number; volume?: number };

type Props = {
  candles: Candle[];
  height?: number;
};

export default function Candles({ candles, height = 340 }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width = canvas.clientWidth;
    const h = canvas.height = height;
    ctx.clearRect(0, 0, width, h);
    if (!candles || candles.length === 0) return;
    const min = Math.min(...candles.map((c) => c.low));
    const max = Math.max(...candles.map((c) => c.high));
    const dx = candles.length;
    const toX = (i: number) => (i / dx) * width;
    const toY = (v: number) => h - ((v - min) / (max - min || 1)) * h;
    const barW = Math.max(2, Math.min(10, width / dx * 0.6));
    candles.forEach((c, i) => {
      const x = toX(i);
      const yOpen = toY(c.open);
      const yClose = toY(c.close);
      const yHigh = toY(c.high);
      const yLow = toY(c.low);
      const up = c.close >= c.open;
      ctx.strokeStyle = up ? '#32E56D' : '#E84134';
      ctx.fillStyle = up ? '#32E56D' : '#E84134';
      // wick
      ctx.beginPath();
      ctx.moveTo(x, yHigh); ctx.lineTo(x, yLow); ctx.stroke();
      // body
      const bx = x - barW / 2;
      const by = Math.min(yOpen, yClose);
      const bh = Math.max(1, Math.abs(yClose - yOpen));
      ctx.fillRect(bx, by, barW, bh);
    });
  }, [candles, height]);
  return (
    <div style={{ height }}>
      <canvas ref={ref} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}


