import React, { useEffect, useMemo, useState } from 'react';
import { TrendminerApi } from '../../api/backend';

export default function GlobalStatsAnalytics() {
  const [last7Days, setLast7Days] = useState<number>(0);
  const [totals, setTotals] = useState<{ total_market_cap_sum?: number; total_tokens?: number; total_created_tokens?: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    async function load() {
      setLoading(true);
      try {
        const toIso = (d: Date) => d.toISOString().slice(0, 10);
        const end = new Date();
        const start = new Date(Date.now() - 7 * 24 * 3600 * 1000);
        const daily = await TrendminerApi.fetchJson(`/api/analytics/daily-trade-volume?start_date=${toIso(start)}&end_date=${toIso(end)}`);
        const last24 = await TrendminerApi.fetchJson('/api/analytics/past-24-hours');
        if (!cancel) {
          const sum = Array.isArray(daily) ? daily.reduce((s: number, d: any) => s + Number(d.volume_ae || 0), 0) : 0;
          setLast7Days(sum);
          setTotals(last24 || {});
        }
      } finally {
        if (!cancel) setLoading(false);
      }
    }
    load();
    return () => { cancel = true; };
  }, []);

  const items = useMemo(() => ([
    { name: 'Total Market Cap', value: `${(totals?.total_market_cap_sum ?? 0).toLocaleString()} AE` },
    { name: 'Volume (7d)', value: `${(last7Days ?? 0).toLocaleString()} AE` },
    { name: 'Unique tokens', value: totals?.total_tokens ?? 0 },
    { name: 'Created tokens (24h)', value: totals?.total_created_tokens ?? 0 },
  ]), [totals, last7Days]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((it) => (
        <div key={it.name} className="p-2 bg-black/5 dark:bg-white/5 rounded-lg">
          <div className="text-xs opacity-80 mb-1">{it.name}</div>
          <div className="font-extrabold text-sm sm:text-base">{loading ? '…' : (it.value as any)}</div>
        </div>
      ))}
    </div>
  );
}


