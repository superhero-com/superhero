import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTrendingTagMap } from '../hooks/useTrendingTagMap';
import { useTokenPerformance } from '../hooks/useTokenPerformance';

export default function HashtagWithChange({ tag }: { tag: string }) {
  const clean = String(tag || '').replace(/^#/, '');
  const upper = clean.toUpperCase();
  const { map } = useTrendingTagMap();
  const saleAddress = map[upper];
  const { performance } = useTokenPerformance(saleAddress);

  const change = performance?.current_change_percent;
  const sign = (change ?? 0) > 0 ? '+' : '';
  const isUp = (change ?? 0) > 0;
  const isDown = (change ?? 0) < 0;
  const colorClass = isUp ? 'text-green-400' : isDown ? 'text-red-400' : 'text-white/60';
  const arrow = isUp ? '▲' : isDown ? '▼' : '•';
  const formatted = useMemo(() => {
    if (change == null) return null;
    const abs = Math.abs(change);
    const precision = abs < 0.01 ? 3 : 2;
    return `${sign}${abs.toFixed(precision)}%`;
  }, [change, sign]);

  const linkTo = `/trends/tokens/${upper}`;

  return (
    <span className="inline-flex items-center align-middle">
      <Link
        to={linkTo}
        className="text-[var(--neon-teal)] underline-offset-2 hover:underline break-words"
        onClick={(e) => e.stopPropagation()}
      >
        #{clean}
      </Link>
      {saleAddress && formatted && (
        <span
          className={`ml-1 inline-flex items-center gap-1 text-[11px] ${colorClass}`}
          title="24h change"
          aria-label={`24h change: ${formatted}`}
        >
          <span className="leading-none">{arrow}</span>
          <span className="leading-none font-medium">{formatted}</span>
        </span>
      )}
    </span>
  );
}


