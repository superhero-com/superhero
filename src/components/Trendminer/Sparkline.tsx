import React from 'react';

type Props = {
  points: Array<{ x: number; y: number }> | number[];
  width?: number;
  height?: number;
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
};

export default function Sparkline({ points, width = 240, height = 60, stroke = '#FF6D15', strokeWidth = 2, fill = 'none' }: Props) {
  const data = Array.isArray(points) && typeof points[0] === 'number'
    ? (points as number[]).map((y, i) => ({ x: i, y }))
    : (points as Array<{ x: number; y: number }>);
  if (!data || data.length === 0) return <svg width={width} height={height} />;
  const xs = data.map((p) => p.x);
  const ys = data.map((p) => Number(p.y));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const dx = maxX - minX || 1;
  const dy = maxY - minY || 1;
  const pad = 2;
  const toSvgX = (x: number) => pad + ((x - minX) / dx) * (width - pad * 2);
  const toSvgY = (y: number) => height - pad - ((y - minY) / dy) * (height - pad * 2);
  const d = data.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toSvgX(p.x).toFixed(2)} ${toSvgY(Number(p.y)).toFixed(2)}`).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="sparkline">
      <path d={d} stroke={stroke} strokeWidth={strokeWidth} fill={fill} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}


