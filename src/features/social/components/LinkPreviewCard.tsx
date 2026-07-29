import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IconClose } from '@/icons';
import { safeHref } from '@/utils/safeHref';

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
  const { t } = useTranslation();
  // null = not yet loaded, false = all proxies failed, OgData = full card
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
      aria-label={t('social.dismissPreview')}
    >
      <IconClose className="w-3 h-3 text-white" />
    </button>
  ) : null;

  // Loading skeleton
  if (data === null) {
    return (
      <div className="relative rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-2 right-2 z-10 bg-black/60 rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80 transition-colors"
            aria-label={t('social.dismissPreview')}
          >
            <IconClose className="w-3 h-3 text-white" />
          </button>
        )}
        <div className="flex gap-3 p-3">
          <div className="w-20 h-16 rounded-lg link-skeleton-shimmer flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 link-skeleton-shimmer rounded w-1/3" />
            <div className="h-4 link-skeleton-shimmer rounded w-3/4" />
            <div className="h-3 link-skeleton-shimmer rounded w-full" />
          </div>
        </div>
        <style>
          {`
            .link-skeleton-shimmer {
              background: linear-gradient(90deg,
                rgba(255, 255, 255, 0.08) 25%,
                rgba(255, 255, 255, 0.15) 50%,
                rgba(255, 255, 255, 0.08) 75%
              );
              background-size: 200% 100%;
              animation: link-skeleton-loading 2.5s infinite linear;
            }

            @keyframes link-skeleton-loading {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }

            /* Mobile browsers may render animations faster, so pin the duration
               to match the post skeleton appearance. */
            @media (max-width: 768px) {
              .link-skeleton-shimmer {
                animation: link-skeleton-loading 2.5s infinite linear !important;
                animation-duration: 2.5s !important;
                animation-timing-function: linear !important;
              }
            }
          `}
        </style>
      </div>
    );
  }

  if (data === false) {
    return null;
  }

  // Full OG card
  // `data.url` is the `og:url` meta tag scraped from a REMOTE, attacker-controlled page (via the
  // proxy above) — never trust its scheme. Fall back to the (already http(s)-only, per
  // `useLinkDetection`) `url` prop, then to an inert `#` if even that somehow isn't safe.
  const href = safeHref(data.url) ?? safeHref(url) ?? '#';

  return (
    <a
      href={href}
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
            alt={data.title ?? t('social.linkPreviewAlt')}
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
