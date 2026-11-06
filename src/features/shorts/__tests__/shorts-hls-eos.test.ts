import Hls from 'hls.js';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { completeShortsHlsEos } from '../shorts-hls-eos';

const range = (start = 0, end = 5.999999) => ({ length: 1, start: () => start, end: () => end });
const cleanups: (() => void)[] = [];
beforeEach(() => { vi.spyOn(document, 'hidden', 'get').mockReturnValue(false); });
afterEach(() => { cleanups.splice(0).forEach((cleanup) => cleanup()); vi.restoreAllMocks(); });
function fixture() {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();
  const main = {
    type: 'main', level: 0, sn: 2, endList: true, start: 4, end: 6,
  };
  const audio = {
    type: 'audio',
    level: 0,
    sn: 3,
    endList: true,
    start: 6.016,
    end: 6.021333,
    startPTS: 6.016,
    endPTS: 6.021333,
  };
  const engine = {
    loadLevel: 0,
    latestLevelDetails: { live: false, fragments: [main] },
    audioTrack: 0,
    audioTracks: [{ groupId: 'main', details: { live: false, fragments: [audio] } }],
    on(event: string, handler: (...args: any[]) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
    },
    off(event: string, handler: (...args: any[]) => void) {
      listeners.get(event)?.delete(handler);
    },
    trigger: vi.fn((event: string, data: any) => {
      listeners.get(event)?.forEach((handler) => handler(event, data));
    }),
  };
  const media = document.createElement('video');
  Object.defineProperties(media, {
    duration: { value: 6, writable: true },
    paused: { value: false, writable: true },
    seeking: { value: false, writable: true },
    error: { value: null, writable: true },
    ended: { value: false, writable: true },
    buffered: { value: range(), writable: true },
  });
  media.currentTime = 2;
  const videoBuffer = { updating: false, buffered: range() };
  const audioBuffer = { updating: false, buffered: range() };
  let active = true;
  const control = completeShortsHlsEos(engine as unknown as Hls, media, () => active);
  cleanups.push(control.destroy);
  const emit = (event: string, data: any = {}) => engine.trigger(event, data);
  emit(Hls.Events.MANIFEST_PARSED);
  const tracks = { video: { buffer: videoBuffer }, audio: { buffer: audioBuffer } };
  emit(Hls.Events.BUFFER_CREATED, { tracks });
  const finalFragments = () => {
    emit(Hls.Events.FRAG_BUFFERED, { frag: main, part: null });
    emit(Hls.Events.FRAG_BUFFERED, { frag: audio, part: null });
  };
  const videoEos = () => emit(Hls.Events.BUFFER_EOS, { type: 'video' });
  const audioEos = () => engine.trigger.mock.calls.filter(([event, data]) => event === Hls.Events.BUFFER_EOS && data.type === 'audio');
  return {
    engine,
    media,
    main,
    audio,
    videoBuffer,
    audioBuffer,
    control,
    emit,
    finalFragments,
    videoEos,
    audioEos,
    deactivate: () => { active = false; },
    activate: () => { active = true; },
  };
}

describe('Shorts HLS padded audio completion', () => {
  it('completes only the missing audio EOS after the current final tracks are appended', async () => {
    const f = fixture();
    f.finalFragments(); f.videoEos();
    expect(f.audioEos()).toHaveLength(0);
    await Promise.resolve();
    expect(f.audioEos()).toHaveLength(1);
    expect(f.media.currentTime).toBe(2);
    f.control.check(); await Promise.resolve();
    expect(f.audioEos()).toHaveLength(1);
  });
  it.each(['main', 'audio', 'video-eos'])('requires actual %s completion evidence', async (missing) => {
    const f = fixture();
    if (missing !== 'main') f.emit(Hls.Events.FRAG_BUFFERED, { frag: f.main });
    if (missing !== 'audio') f.emit(Hls.Events.FRAG_BUFFERED, { frag: f.audio });
    if (missing !== 'video-eos') f.videoEos();
    await Promise.resolve(); expect(f.audioEos()).toHaveLength(0);
  });
  it.each(['inactive', 'paused', 'hidden', 'seeking', 'error', 'ended', 'infinite-duration', 'zero-time', 'missing-tail', 'gap', 'missing-audio-tail', 'missing-video-tail', 'video-updating', 'audio-updating', 'audio-in-duration', 'long-audio-tail', 'live-main', 'live-audio', 'partial-audio', 'not-endlist', 'stale-main', 'stale-audio', 'wrong-level'])('does not complete %s', async (reason) => {
    const f = fixture();
    if (reason === 'inactive') f.deactivate();
    if (reason === 'hidden') vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    if (['paused', 'seeking', 'ended'].includes(reason)) Object.assign(f.media, { [reason]: true });
    if (reason === 'error') Object.assign(f.media, { error: { code: 3 } });
    if (reason === 'infinite-duration') Object.assign(f.media, { duration: Infinity });
    if (reason === 'zero-time') f.media.currentTime = 0;
    if (reason === 'missing-tail') Object.assign(f.media, { buffered: range(0, 5.8) });
    if (reason === 'gap') Object.assign(f.media, { buffered: range(3, 6) });
    if (reason === 'missing-audio-tail') f.audioBuffer.buffered = range(0, 5.8);
    if (reason === 'missing-video-tail') f.videoBuffer.buffered = range(0, 5.8);
    if (reason === 'video-updating') f.videoBuffer.updating = true;
    if (reason === 'audio-updating') f.audioBuffer.updating = true;
    if (reason === 'audio-in-duration') f.audio.startPTS = 5.9;
    if (reason === 'long-audio-tail') f.audio.endPTS = 6.2;
    if (reason === 'live-main') f.engine.latestLevelDetails.live = true;
    if (reason === 'live-audio') f.engine.audioTracks[0].details.live = true;
    if (reason === 'not-endlist') f.audio.endList = false;
    if (reason === 'stale-main') f.engine.latestLevelDetails.fragments = [{ ...f.main }];
    if (reason === 'stale-audio') f.engine.audioTracks[0].details.fragments = [{ ...f.audio }];
    if (reason === 'wrong-level') f.engine.loadLevel = 1;
    f.emit(Hls.Events.FRAG_BUFFERED, { frag: f.main });
    f.emit(Hls.Events.FRAG_BUFFERED, { frag: f.audio, part: reason === 'partial-audio' ? {} : null });
    f.videoEos(); await Promise.resolve(); expect(f.audioEos()).toHaveLength(0);
  });
  it.each(['source', 'level', 'audio-track', 'detach', 'reset', 'destroy', 'pause', 'seek', 'append', 'tail-flush'])('cancels queued completion on %s', async (change) => {
    const f = fixture(); f.finalFragments(); f.videoEos();
    if (change === 'source') f.emit(Hls.Events.MANIFEST_LOADING);
    if (change === 'level') f.emit(Hls.Events.LEVEL_SWITCHING);
    if (change === 'audio-track') f.emit(Hls.Events.AUDIO_TRACK_SWITCHING);
    if (change === 'detach') f.emit(Hls.Events.MEDIA_DETACHING);
    if (change === 'reset') f.emit(Hls.Events.BUFFER_RESET);
    if (change === 'destroy') f.control.destroy();
    if (change === 'pause') f.media.dispatchEvent(new Event('pause'));
    if (change === 'seek') f.media.dispatchEvent(new Event('seeking'));
    if (change === 'append') f.emit(Hls.Events.BUFFER_APPENDING, { type: 'audio' });
    if (change === 'tail-flush') {
      f.emit(Hls.Events.BUFFER_FLUSHING, { type: 'video', startOffset: 4, endOffset: Infinity });
      f.emit(Hls.Events.BUFFER_FLUSHED, { type: 'video' });
    }
    await Promise.resolve(); expect(f.audioEos()).toHaveLength(0);
  });
  it('requires completed appends and current final audio evidence again', async () => {
    const f = fixture(); f.finalFragments(); f.videoEos();
    f.emit(Hls.Events.BUFFER_APPENDING, { type: 'audio' });
    f.audioBuffer.updating = true;
    f.emit(Hls.Events.FRAG_BUFFERED, { frag: f.audio });
    await Promise.resolve(); expect(f.audioEos()).toHaveLength(0);
    f.audioBuffer.updating = false;
    f.emit(Hls.Events.BUFFER_APPENDED, { type: 'audio' });
    await Promise.resolve(); expect(f.audioEos()).toHaveLength(1);
  });
  it('does not retain an abandoned append counter after a quality switch', async () => {
    const f = fixture();
    f.emit(Hls.Events.BUFFER_APPENDING, { type: 'video' });
    f.emit(Hls.Events.LEVEL_SWITCHING);
    // HLS aborted the old append; the selected rendition has now really completed.
    f.finalFragments(); f.videoEos();
    await Promise.resolve(); expect(f.audioEos()).toHaveLength(1);
  });
  it('ignores late previous-source fragments before the replacement manifest is parsed', async () => {
    const f = fixture(); f.finalFragments(); f.videoEos();
    f.emit(Hls.Events.MANIFEST_LOADING);
    f.finalFragments(); f.videoEos();
    await Promise.resolve(); expect(f.audioEos()).toHaveLength(0);
    f.emit(Hls.Events.MANIFEST_PARSED);
    f.control.check(); await Promise.resolve(); expect(f.audioEos()).toHaveLength(0);
  });
  it('retains valid final evidence across earlier back-buffer eviction', async () => {
    const f = fixture(); f.finalFragments(); f.videoEos();
    f.emit(Hls.Events.BUFFER_FLUSHING, { type: 'audio', startOffset: 0, endOffset: 1 });
    await Promise.resolve(); expect(f.audioEos()).toHaveLength(0);
    f.emit(Hls.Events.BUFFER_FLUSHED, { type: 'audio' });
    await Promise.resolve(); expect(f.audioEos()).toHaveLength(1);
  });
  it('requires the replacement video final fragment while preserving unchanged audio', async () => {
    const f = fixture(); f.finalFragments(); f.videoEos();
    const replacement = { ...f.main, level: 1 };
    f.engine.loadLevel = 1; f.engine.latestLevelDetails.fragments = [replacement];
    f.emit(Hls.Events.LEVEL_SWITCHING);
    f.finalFragments(); f.videoEos();
    await Promise.resolve(); expect(f.audioEos()).toHaveLength(0);
    f.emit(Hls.Events.FRAG_BUFFERED, { frag: replacement });
    await Promise.resolve(); expect(f.audioEos()).toHaveLength(1);
  });
  it('requires the replacement audio final fragment after an audio-group switch', async () => {
    const f = fixture(); f.finalFragments(); f.videoEos();
    const replacement = { ...f.audio };
    f.engine.audioTracks[0] = {
      groupId: 'rescue', details: { live: false, fragments: [replacement] },
    };
    f.emit(Hls.Events.AUDIO_TRACK_SWITCHING);
    f.finalFragments();
    await Promise.resolve(); expect(f.audioEos()).toHaveLength(0);
    f.emit(Hls.Events.FRAG_BUFFERED, { frag: replacement });
    await Promise.resolve(); expect(f.audioEos()).toHaveLength(1);
  });
  it.each(['playing', 'seeked', 'active'])('rechecks retained evidence on %s without polling', async (event) => {
    const f = fixture(); f.deactivate(); f.finalFragments(); f.videoEos();
    await Promise.resolve(); expect(f.audioEos()).toHaveLength(0);
    f.activate();
    if (event === 'active') f.control.check(); else f.media.dispatchEvent(new Event(event));
    await Promise.resolve(); expect(f.audioEos()).toHaveLength(1);
  });
});
