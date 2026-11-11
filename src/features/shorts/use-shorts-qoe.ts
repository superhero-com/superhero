import {
  useCallback, useEffect, useRef, type RefObject,
} from 'react';
import Hls from 'hls.js';
import { PlaybackQuality, type QualitySignal, type QualitySnapshot } from './shorts-qoe';
import { shortsQualityReport } from './shorts-media';
import type { ShortsQuality } from './shorts-quality';

export function useShortsQoe(video: RefObject<HTMLVideoElement | null>, id: string, options: {
  active: boolean; enabled: boolean; mode: ShortsQuality; token: RefObject<string>; shouldPlay: () => boolean;
}) {
  const current = useRef(options); current.current = options;
  const observer = useRef<((event: QualitySignal) => void) | undefined>(undefined);
  useEffect(() => {
    const element = video.current;
    if (!element || !options.active || !options.enabled) return undefined;
    const frames = typeof element.requestVideoFrameCallback === 'function';
    let metrics = new PlaybackQuality({
      mode: current.current.mode,
      engine: Hls.isSupported() ? 'mse' : 'native-hls',
      warm: element.readyState >= 2,
      method: frames ? 'frame' : 'playing',
    }, current.current.shouldPlay() && !document.hidden);
    let collecting = true; let sourceChanging = false;
    let callback: number | undefined; let busy = false; let pending: { value: QualitySnapshot; token: string } | undefined;
    const abort = new AbortController();
    const sampleFrames = () => {
      const quality = element.getVideoPlaybackQuality?.();
      if (quality) metrics.frames(quality);
    };
    sampleFrames();
    const send = () => {
      if (busy || !pending || !current.current.enabled || !(pending.token || current.current.token.current)) return;
      const item = pending; pending = undefined; busy = true;
      shortsQualityReport(id, item.token || current.current.token.current, item.value, abort.signal)
        .catch(() => undefined).finally(() => { busy = false; send(); });
    };
    const flush = (final = false) => {
      if (!collecting || !current.current.enabled || (document.hidden && !final)) return;
      sampleFrames(); const value = metrics.snapshot(final); pending = { value, token: current.current.token.current }; send();
      if (value.elapsedMs === 600000 || value.seq >= 256) collecting = false;
    };
    const frame = () => {
      if (!collecting) return;
      sampleFrames(); metrics.frame(element.videoWidth, element.videoHeight); sourceChanging = false;
    };
    const schedule = () => {
      if (!frames || !collecting || document.hidden) return;
      callback = element.requestVideoFrameCallback((_now, metadata) => {
        callback = undefined;
        if (!collecting || document.hidden) return;
        sampleFrames();
        metrics.frame(metadata.width, metadata.height, metadata, element.playbackRate);
        sourceChanging = false; schedule();
      });
    };
    const play = () => { if (collecting) { sampleFrames(); metrics.intent(current.current.shouldPlay() && !document.hidden); } };
    const pause = () => {
      if (!collecting || !element.paused) return;
      if (sourceChanging && current.current.shouldPlay()) metrics.wait(); else metrics.intent(false);
    };
    const wait = () => { if (collecting) metrics.wait(); };
    const seek = () => { if (collecting) metrics.seek(true); };
    const seeked = () => { if (collecting) metrics.seek(false); };
    const fallback = () => { if (!frames && !document.hidden && !element.paused && element.readyState >= 2) frame(); };
    const suspend = () => {
      flush(true); metrics.intent(false);
      if (callback !== undefined) element.cancelVideoFrameCallback(callback);
      callback = undefined;
    };
    const exit = () => {
      if (document.hidden) suspend();
      else if (collecting && current.current.active) {
        sampleFrames(); metrics.intent(current.current.shouldPlay() && !document.hidden);
        if (callback === undefined) schedule();
      }
    };
    const pagehide = suspend;
    const error = () => {
      if (!collecting) return;
      metrics.signal({ type: 'fatal', reason: element.error?.code === 2 ? 'network' : 'media' }); flush();
    };
    observer.current = (event) => {
      if (document.hidden) return;
      if (event.type === 'generation') {
        flush(true);
        metrics = new PlaybackQuality({
          mode: current.current.mode,
          engine: Hls.isSupported() ? 'mse' : 'native-hls',
          warm: false,
          method: frames ? 'frame' : 'playing',
          origin: 'replacement',
        }, current.current.shouldPlay() && !document.hidden);
        collecting = true; sampleFrames(); return;
      }
      if (!collecting) return;
      sampleFrames(); metrics.signal(event);
      if (event.type === 'source') {
        sourceChanging = true;
        if (callback !== undefined) element.cancelVideoFrameCallback(callback);
        schedule();
      }
      if (event.type === 'fatal') flush();
    };
    const listeners = {
      play, pause, error, waiting: wait, stalled: wait, seeking: seek, seeked, playing: fallback, timeupdate: fallback,
    };
    Object.entries(listeners).forEach(([name, listener]) => element.addEventListener(name, listener));
    document.addEventListener('visibilitychange', exit); window.addEventListener('pagehide', pagehide);
    const interval = setInterval(() => {
      flush();
      if (!collecting) {
        if (callback !== undefined) element.cancelVideoFrameCallback(callback);
      }
    }, 5000);
    schedule();
    return () => {
      flush(true); collecting = false; observer.current = undefined; clearInterval(interval);
      if (callback !== undefined) element.cancelVideoFrameCallback(callback);
      Object.entries(listeners).forEach(([name, listener]) => element.removeEventListener(name, listener));
      document.removeEventListener('visibilitychange', exit); window.removeEventListener('pagehide', pagehide);
      if (!current.current.enabled) { pending = undefined; abort.abort(); }
    };
  }, [video, id, options.active, options.enabled]);
  return useCallback((event: QualitySignal) => observer.current?.(event), []);
}
