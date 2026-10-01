/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- The scrollable feed needs keyboard focus. */
import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark, Captions, ArrowDown, ArrowLeft, ArrowUp, ChevronDown, Clapperboard,
  Flag, Info, Maximize2, Pause, Play, Plus, Share2, SlidersHorizontal,
  Volume2, VolumeX, X, EyeOff,
} from 'lucide-react';
import { SHORTS_API } from './api';
import { ShortsContentWarning } from './shorts-content-warning';
import { ShortsDialog } from './shorts-dialog';
import { ShortsLikeButton } from './shorts-like-button';
import { ShortsCreator, ShortsCreatorAvatar } from './shorts-creator';
import { ShortsFollow } from './shorts-follow';
import type { useShortsSocial } from './use-shorts-social';
import type { useShortsPreferences } from './shorts-preferences';
import type { Short } from './types';

type Props = {
  feed: Short[];
  topics: string[];
  topic: string;
  onTopic: (topic: string) => void;
  onLike: (short: Short) => void;
  onView: (id: string, seconds: number) => void;
  onReport: (id: string, reportId: string, reason: string, detail: string) => Promise<boolean | undefined> | void;
  personal?: ReturnType<typeof useShortsPreferences>;
  social?: ReturnType<typeof useShortsSocial>;
  onConnect?: () => unknown;
  onDeleteMeasurements?: () => void;
  onPlayback?: (id: string, event: string, seconds: number) => void;
  onStudio: () => void;
  onUpload: () => void;
  message: string;
  onDismissMessage: () => void;
  busy: boolean;
  suspended: boolean;
  ready: boolean;
  shared?: boolean;
};
const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

const ShortPlayer = ({
  short, active, warm, muted, onMute, onLike, onView, onDetails, onShare, busy, onPlayback, onSave, saved,
}: {
  short: Short; active: boolean; warm: boolean; muted: boolean; busy: boolean;
  onMute: () => void; onLike: () => void; onDetails: () => void; onShare: () => void;
  onView: Props['onView'];
  onPlayback?: Props['onPlayback']; onSave?: () => void; saved?: boolean;
}) => {
  const video = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(short.duration);
  const [failed, setFailed] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const manuallyPaused = useRef(false);
  const watched = useRef(0);
  const lastTime = useRef(0);
  const measurement = useRef({ id: crypto.randomUUID(), sent: -1 });
  const playbackRef = useRef(onPlayback);
  playbackRef.current = onPlayback;
  const [captions, setCaptions] = useState(false);
  const warning = short.contentWarning || (short.moderation === 'rejected' ? 'feed-excluded' : undefined);
  const warningKey = `${short.id}:${warning}:${short.guidelines?.status}`;
  const [revealedFor, setRevealedFor] = useState('');
  const covered = !!warning && revealedFor !== warningKey;
  useEffect(() => { if (!warning) setRevealedFor(''); }, [warning]);
  const measure = useCallback(() => {
    if (!playbackRef.current) return;
    const seconds = Math.min(short.duration, watched.current);
    if (measurement.current.sent < 0 || seconds - measurement.current.sent >= 2 || seconds >= short.duration * 0.95) {
      if (measurement.current.sent >= short.duration && seconds >= short.duration) return;
      playbackRef.current(short.id, measurement.current.id, seconds);
      measurement.current.sent = seconds;
    }
  }, [short.duration, short.id]);
  useEffect(() => {
    if (onPlayback) { measurement.current = { id: crypto.randomUUID(), sent: -1 }; watched.current = 0; }
  }, [onPlayback]);
  useEffect(() => {
    const element = video.current;
    if (element?.textTracks[0]) element.textTracks[0].mode = captions ? 'showing' : 'hidden';
  }, [captions, covered]);
  useEffect(() => {
    const element = video.current;
    if (!element) return undefined;
    if (active && !manuallyPaused.current) {
      measure();
      element.play().catch(() => setPaused(true));
    } else element.pause();
    return () => element.pause();
  }, [active, measure, covered]);
  const toggle = useCallback(() => {
    const element = video.current;
    if (!element || failed || covered) return;
    if (element.paused) {
      manuallyPaused.current = false;
      element.play().catch(() => setPaused(true));
    } else {
      manuallyPaused.current = true;
      element.pause();
    }
  }, [failed, covered]);
  useEffect(() => {
    if (!active || covered) return undefined;
    const keydown = (event: KeyboardEvent) => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof Element && event.target.closest('button,a,input,select,textarea,dialog,[contenteditable="true"]')) return;
      if ([' ', 'k', 'K'].includes(event.key)) { event.preventDefault(); toggle(); }
      if (['m', 'M'].includes(event.key)) { event.preventDefault(); onMute(); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [active, onMute, toggle, covered]);
  const updateTime = () => {
    const element = video.current!;
    const delta = element.currentTime - lastTime.current;
    // Seek jumps do not count as watched time. The API still treats this as a preview metric.
    if (active && !element.paused && delta > 0 && delta < 1.5) watched.current += delta;
    lastTime.current = element.currentTime;
    setPosition(element.currentTime);
    if (watched.current >= 2) onView(short.id, watched.current);
    if (active) measure();
  };
  const fullscreen = async () => {
    const element = video.current;
    if (!element) return;
    const frame = element.closest('.sv-frame') as HTMLElement;
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
    else if (frame.requestFullscreen) await frame.requestFullscreen().catch(() => undefined);
    else (element as HTMLVideoElement & { webkitEnterFullscreen?: () => void }).webkitEnterFullscreen?.();
  };
  return (
    <div className={`sv-composition ${covered ? 'sv-composition--covered' : ''}`}>
      <div className="sv-frame">
        {covered ? (
          <ShortsContentWarning warning={warning!} posterUrl={`${SHORTS_API}${short.posterUrl}`} onReveal={() => setRevealedFor(warningKey)} />
        ) : (
          <>
            <video
              ref={video}
              src={warm ? `${SHORTS_API}${short.videoUrl}` : undefined}
              poster={`${SHORTS_API}${short.posterUrl}`}
              playsInline
              crossOrigin="anonymous"
              loop
              muted={muted}
              preload={warm ? 'auto' : 'none'}
              onPlay={() => { setPaused(false); measure(); }}
              onPause={() => { setPaused(true); measure(); }}
              onWaiting={() => setWaiting(true)}
              onPlaying={() => { setWaiting(false); setFailed(false); }}
              onError={() => { if (warm) { setFailed(true); setWaiting(false); } }}
              onTimeUpdate={updateTime}
              onLoadedMetadata={() => setDuration(video.current?.duration || short.duration)}
              onSeeking={() => { lastTime.current = video.current?.currentTime || 0; }}
            >
              <track kind="captions" src={short.captionsUrl ? `${SHORTS_API}${short.captionsUrl}` : undefined} srcLang={short.language || 'en'} label="Creator captions" />
            </video>
            <button type="button" className="sv-play-surface" aria-label={paused ? `Play ${short.title}` : `Pause ${short.title}`} onClick={toggle} disabled={!active || failed} tabIndex={active ? 0 : -1} />
            <div className="sv-top-controls">
              <button type="button" className="sv-round" aria-label={paused ? 'Play video' : 'Pause video'} onClick={toggle} disabled={failed}>
                {paused ? <Play size={21} fill="currentColor" /> : <Pause size={21} fill="currentColor" />}
              </button>
              {!!warning && (
              <button type="button" className="sv-warning-reset" onClick={() => setRevealedFor('')}>
                <EyeOff size={16} />
                {' '}
                Hide video
              </button>
              )}
              <div>
                <button type="button" className="sv-round" aria-label={muted ? 'Unmute video' : 'Mute video'} onClick={onMute} aria-pressed={!muted}>
                  {muted ? <VolumeX size={21} /> : <Volume2 size={21} />}
                </button>
                {short.captionsUrl && <button type="button" className="sv-round" aria-label="Toggle captions" aria-pressed={captions} onClick={() => setCaptions((v) => !v)}><Captions size={21} /></button>}
                <button type="button" className="sv-round sv-fullscreen" aria-label="Toggle fullscreen" onClick={fullscreen}><Maximize2 size={19} /></button>
              </div>
            </div>
            {paused && !failed && !waiting && <div className="sv-play-indicator" aria-hidden="true"><Play size={32} fill="currentColor" /></div>}
            {waiting && !failed && <div className="sv-loading" role="status">Loading video…</div>}
            {failed && (
            <div className="sv-video-error" role="status">
              <p>This Short couldn’t load.</p>
              <button type="button" onClick={() => { setFailed(false); video.current?.load(); if (active) video.current?.play().catch(() => setPaused(true)); }}>Try again</button>
            </div>
            )}
            <div className="sv-caption">
              <ShortsCreator address={short.creator} enabled={warm} />
              <h2>{short.title}</h2>
              <div className="sv-caption-meta">
                <span>
                  #
                  {short.topic.toLowerCase()}
                </span>
                <span>Free to watch</span>
                {short.synthetic && <span>AI-altered</span>}
                {short.sponsored && <span>Sponsored</span>}
              </div>
            </div>
            <div className="sv-timeline">
              <label className="sv-sr-only" htmlFor={`seek-${short.id}`}>
                Seek
                {short.title}
              </label>
              <input
                id={`seek-${short.id}`}
                type="range"
                min="0"
                max={duration || 1}
                step="0.1"
                value={Math.min(position, duration || 1)}
                aria-valuetext={`${time(position)} of ${time(duration)}`}
                style={{ '--progress': `${duration ? (position / duration) * 100 : 0}%` } as React.CSSProperties}
                onChange={(event) => { if (video.current) video.current.currentTime = Number(event.target.value); setPosition(Number(event.target.value)); }}
              />
              <span>
                {time(position)}
                {' '}
                /
                {' '}
                {time(duration)}
              </span>
            </div>
          </>
        )}
      </div>
      <div className="sv-actions" aria-label="Video actions">
        {!covered && <ShortsLikeButton count={short.likes} liked={short.liked} disabled={busy || short.mine} onLike={onLike} />}
        <div className="sv-action">
          <button type="button" className="sv-action-button" aria-label="Copy Short link" onClick={onShare}><Share2 size={23} /></button>
          <span>Share</span>
        </div>
        <div className="sv-action">
          <button type="button" className="sv-action-button" aria-label="Video details and report" onClick={onDetails}><Info size={24} /></button>
          <span>Details</span>
        </div>
        {!covered && onSave && (
        <div className="sv-action">
          <button type="button" className="sv-action-button" aria-label={saved ? 'Unsave Short' : 'Save Short'} aria-pressed={saved} onClick={onSave}><Bookmark size={23} fill={saved ? 'currentColor' : 'none'} /></button>
          <span>{saved ? 'Saved' : 'Save'}</span>
        </div>
        )}
        {!covered && <ShortsCreatorAvatar address={short.creator} size={36} />}
      </div>
    </div>
  );
};

export const ShortsViewer = ({
  feed, topics, topic, onTopic, onLike, onView, onReport, onStudio, onUpload,
  message, onDismissMessage, busy, suspended, ready, personal, social, onConnect, onDeleteMeasurements, onPlayback, shared = false,
}: Props) => {
  const scroller = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState('');
  const [muted, setMuted] = useState(true);
  const [details, setDetails] = useState<Short>();
  const [followPending, setFollowPending] = useState(false);
  const [filters, setFilters] = useState(false);
  const [notice, setNotice] = useState('');
  const [reporting, setReporting] = useState<{ short: Short; id: string }>();
  const [reason, setReason] = useState('Safety');
  const [detail, setDetail] = useState('');
  const prefs = personal?.preferences;
  const requestedId = new URLSearchParams(window.location.search).get('short');
  const unavailable = !!requestedId && ready && !feed.some((v) => v.id === requestedId);
  const [visible, setVisible] = useState(!document.hidden);
  let emptyTitle = ready ? 'No Shorts in this feed yet' : 'Finding your next Short…';
  let emptyMessage = ready ? 'Try another topic, follow creators, or save videos to build your feed.' : 'Connecting to Superhero Shorts.';
  if (ready && prefs?.mode === 'following') {
    if (social?.status === 'disconnected') {
      emptyTitle = 'Your follows, together'; emptyMessage = 'Connect your wallet to see Shorts from the creators you follow on Superhero.';
    } else if (social?.status === 'loading') {
      emptyTitle = 'Loading your follows…'; emptyMessage = 'Finding Shorts from the creators you follow on Superhero.';
    } else if (social?.status === 'error') {
      emptyTitle = 'Couldn’t load your follows'; emptyMessage = 'Your follows are safe. Try again when the connection is available.';
    }
  }
  if (unavailable) { emptyTitle = 'This Short is unavailable'; emptyMessage = 'Its hosting may have expired, or its creator may have withdrawn it.'; }
  let why = details && prefs?.topics.includes(details.topic) ? `It matches your interest in ${details.topic}.` : 'Recent eligible content, balanced across creators. Payments never affect selection.';
  if (shared) why = 'You opened a direct link to this video. Availability by link does not mean it is eligible for the feed.';
  const feedIds = feed.map((video) => video.id).join(',');
  const index = Math.max(0, feed.findIndex((video) => video.id === activeId));
  const firstMount = useRef(true);
  const previousTopic = useRef(topic);
  const currentId = useRef(activeId);
  currentId.current = activeId;
  useEffect(() => {
    const root = scroller.current;
    if (!root || !feedIds) return undefined;
    const entries = [...root.querySelectorAll<HTMLElement>('[data-short-id]')];
    let requested = previousTopic.current === topic ? currentId.current : undefined;
    if (firstMount.current) requested = new URLSearchParams(window.location.search).get('short') || undefined;
    previousTopic.current = topic;
    const initial = Math.max(0, entries.findIndex((entry) => entry.dataset.shortId === requested));
    firstMount.current = false;
    setActiveId(entries[initial]?.dataset.shortId || '');
    root.scrollTo({ top: initial * root.clientHeight, behavior: 'instant' });
    return undefined;
  }, [feedIds, topic]);
  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  const navigate = useCallback((next: number) => {
    if (!scroller.current || next < 0 || next >= feed.length) return;
    scroller.current.scrollTo({
      top: next * scroller.current.clientHeight,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
  }, [feed.length]);
  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (suspended || details || filters || reporting || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.target instanceof Element && event.target.closest('input,select,textarea,dialog,[contenteditable="true"]')) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault(); navigate(index + (event.key === 'ArrowDown' ? 1 : -1));
      }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [index, navigate, suspended, details, filters, reporting]);
  const share = async (short: Short) => {
    const url = new URL(window.location.href);
    url.searchParams.set('short', short.id);
    try { await navigator.clipboard.writeText(url.href); setNotice('Link copied. This preview opens on your local machine.'); } catch { setNotice('Your browser could not copy the link.'); }
  };
  return (
    <div className="sv-viewer">
      <header className="sv-toolbar">
        <div className="sv-toolbar-title">
          <Link to="/" aria-label="Back to Superhero" className="sv-back"><ArrowLeft size={21} /></Link>
          <Clapperboard size={23} />
          <h1>Shorts</h1>
          <span className="sv-testnet">Testnet</span>
        </div>
        {shared ? <Link className="sv-discover" to="/shorts">Back to feed</Link> : (
          <button type="button" className="sv-discover" onClick={() => setFilters(true)}>
            <span>
              {topic !== 'All' ? topic : ({
                'for-you': 'For you', following: 'Following', recent: 'Recent', saved: 'Saved',
              }[prefs?.mode || 'for-you'])}
            </span>
            <ChevronDown size={15} />
          </button>
        )}
        <div className="sv-toolbar-actions">
          <button type="button" onClick={onStudio}>Creator studio</button>
          <button type="button" className="sv-upload" onClick={onUpload} aria-label="Upload a Short">
            <Plus size={19} />
            <span>Create</span>
          </button>
        </div>
      </header>
      <div className="sv-stage">
        {/* A scrollable region must be focusable for keyboard navigation. */}
        <div
          className="sv-scroll"
          ref={scroller}
          onScroll={(event) => {
            const root = event.currentTarget;
            const next = Math.round(root.scrollTop / root.clientHeight);
            setActiveId(feed[next]?.id || '');
          }}
          role="region"
          aria-label="Shorts video feed"
          tabIndex={0}
        >
          {!unavailable && feed.map((short, i) => (
            <article key={short.id} className="sv-slide" data-short-id={short.id} aria-label={`Short ${i + 1} of ${feed.length}: ${short.title}`} inert={i !== index}>
              <ShortPlayer
                short={short}
                active={i === index && !suspended && !details && !filters && !reporting && visible}
                warm={Math.abs(i - index) <= 1}
                muted={muted}
                onMute={() => setMuted((value) => !value)}
                busy={busy}
                onLike={() => onLike(short)}
                onView={onView}
                onPlayback={prefs?.measured ? onPlayback : undefined}
                onSave={personal ? () => personal.toggle('saved', short.id) : undefined}
                saved={prefs?.saved.includes(short.id)}
                onDetails={() => setDetails(short)}
                onShare={() => share(short)}
              />
            </article>
          ))}
          {(!feed.length || unavailable) && (
            <div className="sv-empty">
              <Clapperboard size={38} />
              <h2>{emptyTitle}</h2>
              <p>{emptyMessage}</p>
              {ready && prefs?.mode === 'following' && social?.status === 'disconnected' && <button type="button" onClick={onConnect}>Connect wallet</button>}
              {ready && prefs?.mode === 'following' && social?.status === 'error' && <button type="button" onClick={social.retry}>Try again</button>}
              {ready && <button type="button" onClick={() => setFilters(true)}>Adjust my feed</button>}
              {unavailable && <Link to="/shorts">Back to Shorts</Link>}
            </div>
          )}
        </div>
        {feed.length > 1 && !unavailable && (
        <div className="sv-navigation">
          <button type="button" aria-label="Previous Short" onClick={() => navigate(index - 1)} disabled={index === 0}><ArrowUp size={24} /></button>
          <span aria-live="polite">
            {index + 1}
            {' '}
            /
            {' '}
            {feed.length}
          </span>
          <button type="button" aria-label="Next Short" onClick={() => navigate(index + 1)} disabled={index === feed.length - 1}><ArrowDown size={24} /></button>
        </div>
        )}
        {!shared && (
        <div className="sv-scroll-hint">
          Scroll to discover
          <ArrowDown size={12} />
        </div>
        )}
      </div>
      {(notice || message) && (
      <div className="sv-toast" role="status">
        <span>{notice || message}</span>
        <button type="button" aria-label="Dismiss notification" onClick={() => { setNotice(''); onDismissMessage(); }}><X size={17} /></button>
      </div>
      )}
      {filters && (
        <ShortsDialog label="Discover Shorts" busy={false} onClose={() => setFilters(false)}>
          <section className="sh-modal sv-details">
            <button type="button" className="sh-close" aria-label="Close topics" onClick={() => setFilters(false)}><X size={20} /></button>
            <SlidersHorizontal size={24} />
            <h2>Make it your feed</h2>
            <p>Choose a topic to see matching videos first.</p>
            <div className="sv-topic-grid">{topics.map((value) => <button type="button" key={value} className={topic === value ? 'selected' : ''} aria-pressed={topic === value} onClick={() => { onTopic(value); setFilters(false); }}>{value === 'All' ? 'For you' : value}</button>)}</div>
            <small>Topics are creator-declared and manually reviewed. JEV suggestions are disabled.</small>
            {personal && prefs && (
            <div className="sv-preferences">
              <h3>Your feed</h3>
              <div className="sv-topic-grid">{(['for-you', 'following', 'recent', 'saved'] as const).map((mode) => <button key={mode} type="button" aria-pressed={prefs.mode === mode} className={prefs.mode === mode ? 'selected' : ''} onClick={() => { personal.update({ mode }); onTopic('All'); }}>{mode.replace('-', ' ')}</button>)}</div>
              <h3>Your interests</h3>
              <div className="sv-topic-grid">{topics.filter((t) => t !== 'All').map((value) => <button type="button" key={value} aria-pressed={prefs.topics.includes(value)} className={prefs.topics.includes(value) ? 'selected' : ''} onClick={() => personal.toggle('topics', value)}>{value}</button>)}</div>
              <label htmlFor="viewer-language">
                Language
                <select id="viewer-language" value={prefs.language} onChange={(e) => personal.update({ language: e.target.value })}>{[['all', 'All languages'], ['und', 'Unspecified'], ['en', 'English'], ['ar', 'Arabic'], ['fr', 'French'], ['es', 'Spanish'], ['de', 'German'], ['zh', 'Chinese']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              </label>
              <p>Follows sync with your Superhero profile. Saved videos, interests and hidden creators stay in this browser. Payments never boost ranking.</p>
              <label className="sh-checkbox" htmlFor="viewer-measurements">
                <input type="checkbox" id="viewer-measurements" checked={prefs.measured} onChange={(e) => personal.update({ measured: e.target.checked })} />
                {' '}
                Share playback measurements to help creators
              </label>
              <small>Optional. A random browser ID is hashed on the server; no wallet address is attached. Playback records are retained for 90 days. Turning this off stops collection.</small>
              <button type="button" disabled={busy} onClick={onDeleteMeasurements}>Delete my playback measurements</button>
              <button
                type="button"
                onClick={() => {
                  personal.update({
                    topics: [], hidden: [], blocked: [], saved: [], language: 'all', mode: 'for-you',
                  }); onTopic('All');
                }}
              >
                Reset feed preferences
              </button>
              {!!prefs.blocked.length && (
              <details>
                <summary>
                  Hidden creators (
                  {prefs.blocked.length}
                  )
                </summary>
                {prefs.blocked.map((address) => (
                  <div key={address}>
                    <span className="sh-address">{address}</span>
                    <button type="button" onClick={() => personal.update({ blocked: prefs.blocked.filter((a) => a !== address) })}>Show again</button>
                  </div>
                ))}
              </details>
              )}
            </div>
            )}
          </section>
        </ShortsDialog>
      )}
      {details && (
        <ShortsDialog label="Short details" busy={busy || followPending} suspended={followPending} onClose={() => setDetails(undefined)}>
          <section className="sh-modal sv-details">
            <button type="button" className="sh-close" aria-label="Close details" onClick={() => setDetails(undefined)} disabled={busy}><X size={20} /></button>
            <span className="sh-eyebrow">ABOUT THIS SHORT</span>
            <h2>{details.title}</h2>
            <ShortsCreator address={details.creator} />
            <ShortsFollow key={details.creator} address={details.creator} onWalletPending={setFollowPending} />
            {details.description && <p>{details.description}</p>}
            <dl>
              <dt>Topic</dt>
              <dd>{details.topic}</dd>
              <dt>Paid Likes</dt>
              <dd>{details.likes}</dd>
              <dt>Views (preview)</dt>
              <dd>{details.views}</dd>
              <dt>Hosted until</dt>
              <dd>{new Date(details.until).toLocaleDateString()}</dd>
            </dl>
            <p>Each Like costs 0.1 test AE: 0.08 AE to the creator and 0.02 AE to the treasury. Network fees are additional.</p>
            <details>
              <summary>IPFS content identifier</summary>
              <code>{details.cid}</code>
            </details>
            {personal && prefs && (
            <>
              <p>
                Why this Short?
                {why}
                {' '}
                Creator diversity also shapes your feed.
              </p>
              <div className="sv-topic-grid">
                <button type="button" onClick={() => { personal.update({ hidden: [...prefs.hidden, details.id] }); setDetails(undefined); }}>Not interested</button>
                <button type="button" onClick={() => { personal.update({ blocked: [...prefs.blocked, details.creator] }); setDetails(undefined); }}>Hide creator</button>
              </div>
            </>
            )}
            <button type="button" className="sv-report" disabled={busy} onClick={() => { setReporting({ short: details, id: crypto.randomUUID() }); setReason('Safety'); setDetail(''); setDetails(undefined); }}>
              <Flag size={17} />
              Report this Short
            </button>
          </section>
        </ShortsDialog>
      )}
      {reporting && (
      <ShortsDialog label="Report Short" busy={busy} onClose={() => setReporting(undefined)}>
        <form className="sh-modal sv-details" onSubmit={async (e) => { e.preventDefault(); const sent = await onReport(reporting.short.id, reporting.id, reason, detail); if (sent) setReporting(undefined); }}>
          <h2>Report this Short</h2>
          {message && <p role="status">{message}</p>}
          <p>{reporting.short.title}</p>
          <label htmlFor="short-report-reason">
            Reason
            <select id="short-report-reason" value={reason} onChange={(e) => setReason(e.target.value)}>{['Safety', 'Harassment', 'Copyright', 'Spam', 'Other'].map((r) => <option key={r}>{r}</option>)}</select>
          </label>
          <label htmlFor="short-report-detail">
            Additional details
            <textarea id="short-report-detail" value={detail} maxLength={1000} rows={4} onChange={(e) => setDetail(e.target.value)} />
          </label>
          <p>No wallet or payment is required. Reports go to the official app’s operator for review.</p>
          <button type="button" disabled={busy} onClick={() => setReporting(undefined)}>Cancel</button>
          <button type="submit" className="primary" disabled={busy}>Submit report</button>
        </form>
      </ShortsDialog>
      )}
    </div>
  );
};
