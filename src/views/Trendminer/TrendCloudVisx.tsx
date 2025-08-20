import React, { useEffect, useMemo, useState } from 'react';
import { TrendminerApi } from '../../api/backend';
import { Wordcloud } from '@visx/wordcloud';

type TrendingTag = { tag: string; score: number; source?: string };

type Props = { embedded?: boolean; width?: number; height?: number };

export default function TrendCloudVisx({ embedded, width = 1100, height = 520 }: Props) {
  const [tags, setTags] = useState<TrendingTag[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const resp = await TrendminerApi.listTrendingTags({ orderBy: 'score', orderDirection: 'DESC', limit: 250, page: 1 });
        const items = Array.isArray(resp?.items) ? resp.items : (Array.isArray(resp) ? resp : []);
        const mapped: TrendingTag[] = items.map((it: any) => ({ tag: it.tag ?? it.name ?? '', score: Number(it.score ?? it.value ?? 0), source: it.source || it.platform || undefined }));
        if (!cancelled) setTags(mapped.filter((t) => t.tag));
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load trending tags');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const words = useMemo(() => tags.map((t) => ({ text: t.tag, value: t.score })), [tags]);

  const cloud = (
    <div style={{ border: '1px dashed rgba(0,0,0,0.12)', borderRadius: 12, marginTop: embedded ? 0 : 12, padding: 8 }}>
      <Wordcloud
        words={words}
        width={width}
        height={height}
        font={"Impact"}
        fontSize={(w) => Math.max(12, Math.min(72, w.value))}
        padding={2}
        spiral={"archimedean"}
        rotate={(w) => (w.value % 3 === 0 ? 0 : (w.value % 2 === 0 ? 30 : -30))}
        random={() => Math.random()}
      >
        {(cloudWords) => (
          <g>
            {cloudWords.map((w, i) => (
              <text
                key={w.text}
                transform={`translate(${w.x}, ${w.y}) rotate(${w.rotate || 0})`}
                fontSize={w.size}
                textAnchor="middle"
                fill={['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'][i % 4]}
                style={{ cursor: 'pointer', fontWeight: 800 }}
                onClick={() => window.location.assign(`/trendminer/create?new=${encodeURIComponent(w.text)}`)}
              >
                {w.text}
              </text>
            ))}
          </g>
        )}
      </Wordcloud>
    </div>
  );

  if (embedded) return cloud;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>TrendCloud (visx)</div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Alternative layout powered by visx wordcloud.</div>
        </div>
        <a href="/trendminer" style={{ padding: '8px 12px', borderRadius: 999, border: '1px solid rgba(0,0,0,0.12)', background: 'white', textDecoration: 'none' }}>Switch to default</a>
      </div>

      {loading && <div style={{ padding: 12 }}>Loading…</div>}
      {error && <div style={{ padding: 12, color: 'tomato' }}>{error}</div>}

      {cloud}
      <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
        Powered by visx wordcloud: <a href="https://airbnb.io/visx/wordcloud" target="_blank" rel="noopener noreferrer">visx/wordcloud</a>.
      </div>
    </div>
  );
}


