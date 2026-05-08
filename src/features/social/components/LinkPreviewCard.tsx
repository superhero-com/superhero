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

// Try these proxies in order — first one to return parseable OG data wins
const PROXIES = [
  (u: string) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
  (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
];

function parseOg(html: string, fallbackUrl: string): OgData | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const getOg = (prop: string) => doc.querySelector(`meta[property="og:${prop}"]`)?.getAttribute('content') ?? null;
  const getMeta = (name: string) => doc.querySelector(`meta[name="${name}"]`)?.getAttribute('content') ?? null;

  const title = getOg('title') ?? doc.querySelector('title')?.textContent?.trim() ?? undefined;
  const description = getOg('description') ?? getMeta('description') ?? undefined;
  const image = getOg('image') ?? undefined;
  const resolvedUrl = getOg('url') ?? fallbackUrl;
  const siteName = getOg('site_name') ?? undefined;

  if (!title && !image) return null;
  return {
    title, description, image, url: resolvedUrl, siteName,
  };
}

async function tryProxy(buildProxy: (u: string) => string, url: string): Promise<OgData | null> {
  try {
    const r = await fetch(buildProxy(url), { signal: AbortSignal.timeout(7000) });
    if (!r.ok) return null;
    const html = await r.text();
    return parseOg(html, url);
  } catch {
    return null;
  }
}

function fetchOgData(url: string): Promise<OgData | null> {
  return PROXIES.reduce<Promise<OgData | null>>(
    (prev, buildProxy) => prev.then((acc) => acc ?? tryProxy(buildProxy, url)),
    Promise.resolve(null),
  );
}

export const LinkPreviewCard = ({ url, onDismiss }: LinkPreviewCardProps) => {
  // null = not yet loaded, false = all proxies failed (show minimal), OgData = full card
  const [data, setData] = useState<OgData | false | null>(null);

  let domain = '';
  try {
    domain = new URL(url).hostname.replace(/^www\./, '');
  } catch { /* ignore */ }

  useEffect(() => {
    setData(null);
    let cancelled = false;
    fetchOgData(url).then((result) => {
      if (!cancelled) setData(result ?? false);
    });
    return () => { cancelled = true; };
  }, [url]);

  const dismissBtn = onDismiss ? (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDismiss(); }}
      className="absolute top-2 right-2 z-10 bg-black/60 rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80 transition-colors"
      aria-label="Dismiss preview"
    >
      <IconClose className="w-3 h-3 text-white" />
    </button>
  ) : null;

  // Loading skeleton
  if (data === null) {
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

  // Minimal fallback: all proxies failed — show favicon + domain so the link is never invisible
  if (data === false) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative rounded-xl border border-white/10 bg-white/5 overflow-hidden flex items-center gap-3 px-3 py-2.5 hover:bg-white/8 hover:border-white/20 transition-all duration-200 no-underline pr-10"
        onClick={(e) => e.stopPropagation()}
      >
        {dismissBtn}
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
          alt=""
          className="w-5 h-5 rounded flex-shrink-0"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="min-w-0 flex-1">
          <span className="text-[11px] text-white/50 uppercase tracking-wide font-medium block truncate">
            {domain}
          </span>
          <span className="text-xs text-white/60 block truncate">{url}</span>
        </div>
      </a>
    );
  }

  // Full OG card
  return (
    <a
      href={data.url ?? url}
      target="_blank"
      rel="noopener noreferrer"
      className="relative rounded-xl border border-white/10 bg-white/5 overflow-hidden flex gap-0 hover:bg-white/8 hover:border-white/20 transition-all duration-200 group no-underline"
      onClick={(e) => e.stopPropagation()}
    >
      {dismissBtn}
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
      </div>
    </a>
  );
};
