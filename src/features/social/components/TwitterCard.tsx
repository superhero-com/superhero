import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { IconClose } from '@/icons';

// Twitter's own embed frame — loaded cross-origin by tweet id. We never fetch
// or inject Twitter's oEmbed `html` into our DOM, and we never load
// `widgets.js` into the superhero.com origin. See HARDEN-02.
const TWITTER_EMBED_ORIGIN = 'https://platform.twitter.com';
const DEFAULT_HEIGHT = 300;
const MAX_HEIGHT = 700;

/** Extract the numeric tweet id from a twitter.com/x.com status URL. */
function extractTweetId(url: string): string | null {
  const match = url.match(/\/status\/(\d+)/);
  return match ? match[1] : null;
}

interface TwitterCardProps {
  url: string;
  onDismiss?: () => void;
}

export const TwitterCard = ({ url, onDismiss }: TwitterCardProps) => {
  const { t } = useTranslation();
  const [tweetId, setTweetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Confirm the tweet exists/is embeddable via Twitter's oEmbed JSON
  // endpoint. The response is only ever read as JSON to check availability —
  // its `html` field is intentionally never used or rendered. The actual
  // embed is always Twitter's own sandboxed frame, addressed by tweet id.
  useEffect(() => {
    setLoading(true);
    setError(false);
    setTweetId(null);
    setHeight(DEFAULT_HEIGHT);

    const id = extractTweetId(url);
    if (!id) {
      setError(true);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;
    fetch(
      `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&omit_script=true&dnt=true`,
    )
      .then((r) => {
        if (!r.ok) throw new Error('failed');
      })
      .then(() => {
        if (!cancelled) setTweetId(id);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [url]);

  // Twitter's embed frame posts its rendered height to the parent window so
  // we can size the sandboxed iframe responsively. Only trust messages that
  // (a) come from Twitter's own embed origin and (b) originate from this
  // exact iframe's contentWindow; anything else (shape, origin) is ignored.
  useEffect(() => {
    if (!tweetId) return undefined;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== TWITTER_EMBED_ORIGIN) return;
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;

      let { data } = event;
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }

      if (!data || typeof data !== 'object' || data.method !== 'twttr.private.resize') return;
      const nextHeight = Number(data.params?.[0]?.height);
      if (Number.isFinite(nextHeight) && nextHeight > 0) {
        setHeight(Math.min(nextHeight, MAX_HEIGHT));
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [tweetId]);

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

  if (error || !tweetId) return null;

  return (
    <div className="relative rounded-xl border border-white/10 overflow-hidden max-h-[700px]">
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
      {/*
        Sandboxed, opaque-origin frame: `allow-scripts allow-popups` and
        NEVER `allow-same-origin`. `allow-scripts` + `allow-same-origin`
        together would let the framed document reach our origin (DOM,
        cookies, IndexedDB — including the seed vault); omitting
        `allow-same-origin` keeps the frame's origin permanently opaque, so
        it cannot read `window.parent.document` or any Superhero storage,
        regardless of what Twitter serves inside it.
      */}
      <iframe
        ref={iframeRef}
        src={`${TWITTER_EMBED_ORIGIN}/embed/Tweet.html?id=${tweetId}&theme=dark&dnt=true`}
        sandbox="allow-scripts allow-popups"
        referrerPolicy="no-referrer"
        title="Twitter post"
        loading="lazy"
        className="w-full block border-0"
        style={{ height }}
      />
    </div>
  );
};
