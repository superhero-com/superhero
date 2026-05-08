import { useState, useEffect } from 'react';
import { IconClose } from '@/icons';

interface OgData {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  siteName?: string;
}

interface LinkPreviewCardProps {
  url: string;
  onDismiss?: () => void;
}

export function LinkPreviewCard({ url, onDismiss }: LinkPreviewCardProps) {
  const [data, setData] = useState<OgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setData(null);

    let cancelled = false;

    const encoded = encodeURIComponent(url);
    fetch(`https://api.codetabs.com/v1/proxy/?quest=${encoded}`)
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed');
        return r.text();
      })
      .then((html) => {
        if (cancelled) return;
        if (!html) { setError(true); return; }

        const doc = new DOMParser().parseFromString(html, 'text/html');
        const getOg = (prop: string) =>
          doc.querySelector(`meta[property="og:${prop}"]`)?.getAttribute('content') ?? null;
        const getMeta = (name: string) =>
          doc.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ?? null;

        const title = getOg('title') ?? doc.querySelector('title')?.textContent?.trim() ?? undefined;
        const description = getOg('description') ?? getMeta('description') ?? undefined;
        const image = getOg('image') ?? undefined;
        const resolvedUrl = getOg('url') ?? url;
        const siteName = getOg('site_name') ?? undefined;

        if (!title && !image) { setError(true); return; }
        setData({ title, description, image, url: resolvedUrl, siteName });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [url]);

  let domain = '';
  try {
    domain = new URL(url).hostname.replace(/^www\./, '');
  } catch { /* ignore */ }

  if (loading) {
    return (
      <div className="relative rounded-xl border border-white/10 bg-white/5 overflow-hidden animate-pulse">
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-2 right-2 z-10 bg-black/60 rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80 transition-colors"
            aria-label="Dismiss preview"
          >
            <IconClose className="w-3 h-3 text-white" />
          </button>
        )}
        <div className="flex gap-3 p-3">
          <div className="w-20 h-16 rounded-lg bg-white/10 flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 bg-white/10 rounded w-1/3" />
            <div className="h-4 bg-white/10 rounded w-3/4" />
            <div className="h-3 bg-white/10 rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) return null;

  return (
    <a
      href={data.url ?? url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative rounded-xl border border-white/10 bg-white/5 overflow-hidden flex gap-0 hover:bg-white/8 hover:border-white/20 transition-all duration-200 group no-underline"
      onClick={(e) => e.stopPropagation()}
    >
      {onDismiss && (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss(); }}
          className="absolute top-2 right-2 z-10 bg-black/60 rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80 transition-colors"
          aria-label="Dismiss preview"
        >
          <IconClose className="w-3 h-3 text-white" />
        </button>
      )}
      {data.image && (
        <div className="flex-shrink-0 w-[120px] md:w-[160px] overflow-hidden">
          <img
            src={data.image}
            alt={data.title ?? 'Link preview'}
            className="w-full h-full object-cover"
            style={{ minHeight: '90px', maxHeight: '120px' }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      <div className="flex flex-col justify-center gap-1 px-3 py-2.5 min-w-0 flex-1">
        {(data.siteName ?? domain) && (
          <span className="text-[11px] text-white/50 uppercase tracking-wide font-medium truncate">
            {data.siteName ?? domain}
          </span>
        )}
        {data.title && (
          <span className="text-sm font-semibold text-white leading-snug line-clamp-2 pr-6">
            {data.title}
          </span>
        )}
        {data.description && (
          <span className="text-xs text-white/60 leading-snug line-clamp-2">
            {data.description}
          </span>
        )}
        {!data.siteName && domain && (
          <span className="text-[11px] text-white/40 mt-0.5 truncate">{domain}</span>
        )}
      </div>
    </a>
  );
}
