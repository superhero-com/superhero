import {
  useEffect, useRef, useState, type RefObject,
} from 'react';
import Hls from 'hls.js';
import type { QualitySignal, QualityFailure } from './shorts-qoe';
import { shortsPlaybackSession } from './shorts-media';
import { ShortsHlsLoader, shortsLoadPolicy } from './shorts-hls-loader';
import { completeShortsHlsEos } from './shorts-hls-eos';
import {
  qualityChoices, qualityManifest, startupQuality, type QualityChoice, type ShortsQuality,
} from './shorts-quality';

type Status = 'loading' | 'preparing' | 'ready' | 'error';

export function useShortHls(
  video: RefObject<HTMLVideoElement | null>,
  id: string,
  warm: boolean,
  shouldPlay: () => boolean,
  measurementSession?: string,
  options: {
    quality?: ShortsQuality; active?: boolean;
    observe?: (event: QualitySignal) => void; onEnded?: () => void;
  } = {},
) {
  const sourceScope = useRef({ id, value: '' });
  const observe = useRef(options.observe); observe.current = options.observe;
  const ended = useRef(options.onEnded); ended.current = options.onEnded;
  const quality = options.quality ?? 'auto';
  const active = options.active ?? true;
  const desired = useRef({ quality, active });
  desired.current = { quality, active };
  const controls = useRef<{ apply:() => void; buffer: () => void; select: (key: string) => void; reset: () => void } | undefined>(undefined);
  const resume = useRef({ id, position: 0 });
  const manual = useRef({ id, key: '' });
  const [choices, setChoices] = useState<QualityChoice[]>([]);
  const [selection, setSelection] = useState('');
  const [currentQuality, setCurrentQuality] = useState('');
  const [status, setStatus] = useState<Status>('loading');
  const [attempt, retry] = useState(0);
  const [token, setToken] = useState('');
  const play = useRef(shouldPlay);
  play.current = shouldPlay;
  useEffect(() => {
    const element = video.current;
    if (!warm || sourceScope.current.id !== id) sourceScope.current = { id, value: '' };
    if (!warm || !element) return undefined;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let preloadTimer: ReturnType<typeof setTimeout>;
    let hls: Hls | undefined;
    let eos: ReturnType<typeof completeShortsHlsEos> | undefined;
    let pending = false;
    let refreshes = 0;
    let preparedUntil = Date.now() + 240000;
    let restorePosition = element.currentTime || (resume.current.id === id ? resume.current.position : 0);
    if (manual.current.id !== id) manual.current = { id, key: '' };
    let manifest = '';
    let attached = false;
    let expiresAt = 0;
    let nativeReady: (() => void) | undefined;
    let started = false;
    let loadingLevel = -1;
    let lastQuickUpgrade = -Infinity;
    let finalFragmentBuffered = false;
    const startupFragments = new Set<number>();
    setStatus('loading');
    setToken(''); setChoices([]); setSelection(''); setCurrentQuality('');

    const ready = () => {
      if (controller.signal.aborted) return;
      setStatus('ready');
      if (play.current() && !document.hidden) {
        element.play().catch((error) => {
          if (error?.name === 'NotAllowedError') observe.current?.({ type: 'blocked' });
        });
      }
    };
    const fail = (reason: Exclude<QualityFailure, 'none'> = 'session') => {
      if (controller.signal.aborted) return;
      clearTimeout(timer);
      hls?.stopLoad();
      element.pause();
      setStatus('error'); observe.current?.({ type: 'fatal', reason });
    };
    const loopAtEnd = () => {
      const remaining = element.duration - element.currentTime;
      const { buffered } = element;
      const details = hls?.latestLevelDetails;
      // The final video fragment may finish before AAC padding. Its ENDLIST and
      // appended final fragment confirm EOF even while the MediaSource is open.
      // Frame-rate switches can shift parsed edges beyond the media buffer.
      const finalFragment = finalFragmentBuffered && details?.live === false;
      if (controller.signal.aborted || !hls || (!hls.bufferedToEnd && !finalFragment)
        || !desired.current.active || !play.current() || document.hidden
        || element.paused || element.seeking || element.error
        || !Number.isFinite(element.duration) || element.currentTime <= 0
        || remaining < 0 || remaining > 0.1 || !buffered.length
        || buffered.start(buffered.length - 1) > element.currentTime
        || buffered.end(buffered.length - 1) < element.duration - 0.01) return;
      ended.current?.();
    };
    const buffer = () => {
      if (!hls) return;
      const saver = desired.current.quality === 'data-saver';
      const available = qualityChoices(hls.levels || []);
      const size = available.find((choice) => choice.index === loadingLevel)?.size ?? 0;
      const activeBuffer = !saver && size >= 1080 ? 6 : 4;
      hls.config.maxBufferLength = desired.current.active ? activeBuffer : 0.5;
      hls.config.maxMaxBufferLength = desired.current.active ? activeBuffer : 1;
      hls.config.maxBufferSize = (desired.current.active && !saver ? 12 : 4) * 1024 * 1024;
      const cap = !available.length || (desired.current.active && !saver)
        ? -1 : startupQuality(available, desired.current.quality, false);
      if (hls.autoLevelCapping !== cap) hls.autoLevelCapping = cap;
    };
    const attachSource = () => {
      if (!manifest || controller.signal.aborted) return;
      if (attached || element.currentTime > 0) restorePosition = Number.isFinite(element.currentTime) ? element.currentTime : 0;
      attached = true;
      setStatus('loading'); setChoices([]); setSelection('');
      observe.current?.({ type: 'source' });
      const source = qualityManifest(manifest, desired.current.quality);
      if (hls) {
        finalFragmentBuffered = false;
        startupFragments.clear(); hls.config.abrBandWidthUpFactor = 1;
        hls.loadSource(source);
      } else {
        if (nativeReady) element.removeEventListener('loadedmetadata', nativeReady);
        nativeReady = () => { element.currentTime = restorePosition; ready(); };
        element.addEventListener('loadedmetadata', nativeReady, { once: true });
        element.src = source; element.load();
      }
    };
    const dimensions = () => {
      if (element.videoWidth && element.videoHeight) setCurrentQuality(`${element.videoWidth} × ${element.videoHeight}`);
    };
    element.addEventListener('resize', dimensions);
    const load = async () => {
      if (controller.signal.aborted || pending) return;
      pending = true;
      try {
        const session = await shortsPlaybackSession(id, controller.signal, measurementSession);
        if (controller.signal.aborted) return;
        const nextToken = session.status === 'ready' ? session.token : (!attached && session.quality?.token);
        if (nextToken) {
          const scope = nextToken.startsWith('v3.') ? nextToken.split('.')[2] : 'legacy';
          if (sourceScope.current.value && sourceScope.current.value !== scope) observe.current?.({ type: 'generation' });
          sourceScope.current.value = scope;
          setToken(nextToken);
        }
        if (session.status === 'preparing') {
          if (Date.now() > preparedUntil) throw new Error('Video preparation timed out');
          setStatus('preparing');
          timer = setTimeout(() => { load(); }, 2000);
          return;
        }
        preparedUntil = Date.now() + 240000;
        manifest = session.manifest; expiresAt = session.expiresAt;
        attachSource();
        clearTimeout(timer);
        const refreshAfter = Math.max(1000, session.expiresAt - Date.now() - 15000);
        timer = setTimeout(() => { load(); }, refreshAfter);
      } catch { fail(); } finally { pending = false; }
    };
    const begin = () => {
      if (started || controller.signal.aborted) return;
      started = true; clearTimeout(preloadTimer); load();
    };
    if (Hls.isSupported()) {
      // fMP4 needs no transmux worker; keep the app's strict worker-src policy.
      hls = new Hls({
        loader: ShortsHlsLoader,
        manifestLoadPolicy: shortsLoadPolicy(Hls.DefaultConfig.manifestLoadPolicy),
        playlistLoadPolicy: shortsLoadPolicy(Hls.DefaultConfig.playlistLoadPolicy),
        fragLoadPolicy: shortsLoadPolicy(Hls.DefaultConfig.fragLoadPolicy),
        keyLoadPolicy: shortsLoadPolicy(Hls.DefaultConfig.keyLoadPolicy),
        enableWorker: false,
        autoStartLoad: false,
        abrEwmaFastVoD: 0.1,
        abrEwmaSlowVoD: 0.3,
        abrBandWidthUpFactor: 1,
        maxBufferLength: 4,
        maxMaxBufferLength: 4,
        backBufferLength: 2,
        maxBufferSize: 12 * 1024 * 1024,
      });
      eos = completeShortsHlsEos(hls, element, () => !controller.signal.aborted
        && desired.current.active && play.current());
      buffer();
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!hls || controller.signal.aborted) return;
        const available = qualityChoices(hls.levels || []);
        setChoices(available);
        const selected = available.find((choice) => choice.key === manual.current.key);
        manual.current.key = selected?.key || ''; setSelection(manual.current.key);
        hls.startLevel = selected?.index ?? startupQuality(available, desired.current.quality, desired.current.active);
        loadingLevel = hls.startLevel; buffer();
        hls.loadLevel = selected?.index ?? -1;
        hls.startLoad(restorePosition); ready();
      });
      hls.on(Hls.Events.LEVEL_SWITCHING, (_event, data) => {
        if (!hls || controller.signal.aborted) return;
        const level = hls.levels[data.level];
        const available = qualityChoices(hls.levels);
        const next = available.find((choice) => choice.index === data.level);
        const previous = available.find((choice) => choice.index === loadingLevel);
        loadingLevel = data.level; buffer();
        if (level) {
          observe.current?.({
            type: 'switch', width: level.width, height: level.height, frameRate: level.frameRate,
          });
        }
        // Replace buffered lower-quality fragments only through Hls.js's seamless
        // switch, which retains the playing fragment and accounts for fetch time.
        if (desired.current.active && hls.autoLevelEnabled && next && next.size >= 1080
          && previous && next.size > previous.size && element.currentTime > 4
          && performance.now() - lastQuickUpgrade > 2000) {
          lastQuickUpgrade = performance.now();
          queueMicrotask(() => {
            if (!controller.signal.aborted && desired.current.active && hls?.autoLevelEnabled
              && hls.loadLevel === data.level) hls.nextLevel = -1;
          });
        }
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        if (!hls || controller.signal.aborted) return;
        const selected = qualityChoices(hls.levels || []).find((choice) => choice.index === data.level);
        if (selected) setCurrentQuality(selected.label);
      });
      hls.on(Hls.Events.FRAG_BUFFERED, (_event, data) => {
        refreshes = 0;
        if (data?.frag.type === 'main' && typeof data.frag.sn === 'number') {
          if (data.frag.endList) finalFragmentBuffered = true;
          startupFragments.add(data.frag.sn);
          // The first measured upgrade still obeys the player's fetch/buffer
          // safety checks. Restore its bandwidth margin after startup.
          if (hls && startupFragments.size >= 2) hls.config.abrBandWidthUpFactor = 0.9;
        }
      });
      hls.on(Hls.Events.MEDIA_ENDED, (_event, data) => {
        if (data.stalled) loopAtEnd();
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) {
          if (data.details === Hls.ErrorDetails.BUFFER_STALLED_ERROR
            && hls?.latestLevelDetails?.live === false) loopAtEnd();
          return;
        }
        // A sleeping tab can outlive its signed links. Refresh once, preserving
        // the playback position and explicit pause. Never fall back to an MP4.
        if (data.response?.code === 401 && refreshes < 1) {
          refreshes += 1; clearTimeout(timer); load();
        } else fail(data.type === Hls.ErrorTypes.MEDIA_ERROR ? 'media' : 'network');
      });
      hls.attachMedia(element);
    } else if (!element.canPlayType('application/vnd.apple.mpegurl')) {
      fail('unsupported');
      element.removeEventListener('resize', dimensions);
      return () => controller.abort();
    }
    controls.current = {
      buffer: () => { buffer(); eos?.check(); if (desired.current.active) begin(); },
      reset: () => {
        manual.current.key = ''; setSelection('');
        // Resume the estimator's current choice; the startup tier can exceed the
        // bandwidth available after a connection drop.
        if (hls) hls.nextLevel = -1;
      },
      apply: () => {
        manual.current.key = ''; setSelection(''); buffer();
        if (manifest && expiresAt <= Date.now() + 15000) { clearTimeout(timer); load(); } else attachSource();
      },
      select: (key: string) => {
        const selected = hls && qualityChoices(hls.levels || []).find((choice) => choice.key === key);
        if (!selected || !hls || controller.signal.aborted) return;
        manual.current.key = key; setSelection(key);
        // Switch at a fragment boundary; do not flush the currently playing frame.
        const level = hls.levels[selected.index];
        observe.current?.({ type: 'switch', width: level.width, height: level.height });
        hls.nextLevel = selected.index;
      },
    };
    // Let active playback establish bandwidth before warming another player.
    // Activation bypasses this delay, including a fast swipe to the next item.
    if (desired.current.active) begin(); else preloadTimer = setTimeout(begin, 3000);
    return () => {
      resume.current = { id, position: attached ? element.currentTime : restorePosition };
      controls.current = undefined;
      element.removeEventListener('resize', dimensions);
      controller.abort(); clearTimeout(timer); clearTimeout(preloadTimer);
      if (nativeReady) element.removeEventListener('loadedmetadata', nativeReady);
      eos?.destroy(); hls?.destroy();
      element.pause(); element.removeAttribute('src'); element.load();
    };
  }, [id, warm, attempt, video, measurementSession]);
  useEffect(() => {
    manual.current.key = ''; setSelection('');
    controls.current?.apply();
  }, [quality]);
  useEffect(() => { controls.current?.buffer(); }, [active]);
  return {
    status, choices, selection, currentQuality, resetQuality: () => controls.current?.reset(), selectLevel: (key: string) => controls.current?.select(key), token: warm ? token : '', retry: () => retry((value) => value + 1),
  };
}
