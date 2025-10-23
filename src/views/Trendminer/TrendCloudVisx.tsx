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
    <div className={`border border-dashed border-white/20 rounded-xl p-2 ${embedded ? 'mt-0' : 'mt-3'} bg-black/10 backdrop-blur-sm`}>
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
                fill={['#3b82f6', '#f59e0b', '#10b981', '#ef4444'][i % 4]}
                className="cursor-pointer font-extrabold hover:opacity-80 transition-opacity duration-200"
                onClick={() => window.location.assign(`/trends/create?tokenName=${encodeURIComponent(w.text)}`)}
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
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-3xl font-extrabold text-white">TrendCloud (visx)</div>
          <div className="text-xs opacity-75 text-white/75">Alternative layout powered by visx wordcloud.</div>
        </div>
        <a 
          href="/trends" 
          className="px-3 py-2 rounded-full border border-white/20 bg-white text-black no-underline hover:bg-gray-100 transition-colors duration-200 text-sm font-medium"
        >
          Switch to default
        </a>
      </div>

      {loading && <div className="p-3 text-white/80">Loading…</div>}
      {error && <div className="p-3 text-red-400">{error}</div>}

      {cloud}
      <div className="mt-2 text-xs opacity-70 text-white/70 text-center">
        Powered by visx wordcloud:{' '}
        <a 
          href="https://airbnb.io/visx/wordcloud" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 transition-colors duration-200"
        >
          visx/wordcloud
        </a>.
      </div>
    </div>
  );
}


