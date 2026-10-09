import {
  useEffect, useRef, useState, type RefObject,
} from 'react';
import Hls from 'hls.js';
import { shortsPlaybackSession } from './shorts-media';

type Status = 'loading' | 'preparing' | 'ready' | 'error';

export function useShortHls(
  video: RefObject<HTMLVideoElement | null>,
  id: string,
  warm: boolean,
  shouldPlay: () => boolean,
) {
  const [status, setStatus] = useState<Status>('loading');
  const [attempt, retry] = useState(0);
  const play = useRef(shouldPlay);
  play.current = shouldPlay;
  useEffect(() => {
    const element = video.current;
    if (!warm || !element) return undefined;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let hls: Hls | undefined;
    let pending = false;
    let refreshes = 0;
    let preparedUntil = Date.now() + 240000;
    let restorePosition = element.currentTime || 0;
    let nativeReady: (() => void) | undefined;
    setStatus('loading');

    const ready = () => {
      if (controller.signal.aborted) return;
      setStatus('ready');
      if (play.current() && !document.hidden) element.play().catch(() => undefined);
    };
    const fail = () => {
      if (controller.signal.aborted) return;
      clearTimeout(timer);
      hls?.stopLoad();
      element.pause();
      setStatus('error');
    };
    const load = async () => {
      if (controller.signal.aborted || pending) return;
      pending = true;
      try {
        const session = await shortsPlaybackSession(id, controller.signal);
        if (controller.signal.aborted) return;
        if (session.status === 'preparing') {
          if (Date.now() > preparedUntil) throw new Error('Video preparation timed out');
          setStatus('preparing');
          timer = setTimeout(() => { load(); }, 2000);
          return;
        }
        preparedUntil = Date.now() + 240000;
        restorePosition = element.currentTime || 0;
        if (hls) {
          hls.loadSource(session.manifest);
        } else {
          if (nativeReady) element.removeEventListener('loadedmetadata', nativeReady);
          nativeReady = () => { element.currentTime = restorePosition; ready(); };
          element.addEventListener('loadedmetadata', nativeReady, { once: true });
          element.src = session.manifest;
          element.load();
        }
        clearTimeout(timer);
        const refreshAfter = Math.max(1000, session.expiresAt - Date.now() - 15000);
        timer = setTimeout(() => { load(); }, refreshAfter);
      } catch { fail(); } finally { pending = false; }
    };
    if (Hls.isSupported()) {
      // fMP4 needs no transmux worker; keep the app's strict worker-src policy.
      hls = new Hls({
        enableWorker: false,
        autoStartLoad: false,
        maxBufferLength: 4,
        maxMaxBufferLength: 6,
        backBufferLength: 2,
        maxBufferSize: 4 * 1024 * 1024,
      });
      hls.on(Hls.Events.MANIFEST_PARSED, () => { hls?.startLoad(restorePosition); ready(); });
      hls.on(Hls.Events.FRAG_BUFFERED, () => { refreshes = 0; });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        // A sleeping tab can outlive its signed links. Refresh once, preserving
        // the playback position and explicit pause. Never fall back to an MP4.
        if (data.response?.code === 401 && refreshes < 1) {
          refreshes += 1; clearTimeout(timer); load();
        } else fail();
      });
      hls.attachMedia(element);
    } else if (!element.canPlayType('application/vnd.apple.mpegurl')) {
      fail();
      return () => controller.abort();
    }
    load();
    return () => {
      controller.abort(); clearTimeout(timer);
      if (nativeReady) element.removeEventListener('loadedmetadata', nativeReady);
      hls?.destroy();
      element.pause(); element.removeAttribute('src'); element.load();
    };
  }, [id, warm, attempt, video]);
  return { status, retry: () => retry((value) => value + 1) };
}
