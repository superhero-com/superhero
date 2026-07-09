import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { IconClose } from '@/icons';

// Load Twitter widgets.js once globally
function loadTwitterScript() {
  if (document.getElementById('twitter-widgets-js')) return;
  const s = document.createElement('script');
  s.id = 'twitter-widgets-js';
  s.src = 'https://platform.twitter.com/widgets.js';
  s.async = true;
  s.charset = 'utf-8';
  document.body.appendChild(s);
}

interface TwitterCardProps {
  url: string;
  onDismiss?: () => void;
}

export const TwitterCard = ({ url, onDismiss }: TwitterCardProps) => {
  const { t } = useTranslation();
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setHtml(null);
    let cancelled = false;

    fetch(
      `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true&theme=dark&dnt=true`,
    )
      .then((r) => {
        if (!r.ok) throw new Error('failed');
        return r.json() as Promise<{ html: string }>;
      })
      .then((data) => {
        if (cancelled) return;
        setHtml(data.html);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [url]);

  // Once HTML is injected, trigger Twitter widget rendering
  useEffect(() => {
    if (!html || !containerRef.current) return;
    loadTwitterScript();
    // If twttr is already loaded, re-process widgets in this container
    const win = window as Window & { twttr?: { widgets?: { load: (el: Element) => void } } };
    win.twttr?.widgets?.load(containerRef.current);
  }, [html]);

  if (loading) {
    return (
      <div className="relative rounded-xl border border-white/10 bg-white/5 overflow-hidden animate-pulse">
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-2 right-2 z-10 bg-black/60 rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80 transition-colors"
            aria-label={t('social.dismiss')}
          >
            <IconClose className="w-3 h-3 text-white" />
          </button>
        )}
        <div className="flex gap-3 p-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 bg-white/10 rounded w-1/4" />
            <div className="h-3 bg-white/10 rounded w-full" />
            <div className="h-3 bg-white/10 rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !html) return null;

  return (
    <div className="relative rounded-xl border border-white/10 overflow-hidden">
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-2 right-2 z-10 bg-black/60 rounded-full w-6 h-6 flex items-center justify-center hover:bg-black/80 transition-colors"
          aria-label={t('social.dismiss')}
        >
          <IconClose className="w-3 h-3 text-white" />
        </button>
      )}
      {/* eslint-disable-next-line react/no-danger */}
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};
