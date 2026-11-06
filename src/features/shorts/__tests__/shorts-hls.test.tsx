import {
  act, cleanup, renderHook, waitFor,
} from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import Hls from 'hls.js';
import { webcrypto, createHash } from 'node:crypto';
import { useShortHls } from '../use-short-hls';
import { shortsPlaybackSession, shortsPlaybackProof } from '../shorts-media';

const mocks = vi.hoisted(() => ({ instances: [] as Array<any>, supported: true }));
vi.mock('hls.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('hls.js')>();
  type Handler = (...args: any[]) => void;
  class FakeHls {
    static DefaultConfig = actual.default.DefaultConfig;

    static ErrorTypes = actual.default.ErrorTypes;

    static ErrorDetails = actual.default.ErrorDetails;

    static Events = actual.default.Events;

    static isSupported = () => mocks.supported;

    handlers = new Map<string, Handler>();

    media?: HTMLVideoElement;

    loadSource = vi.fn();

    startLoad = vi.fn();

    stopLoad = vi.fn();

    destroy = vi.fn();

    levels: Array<any> = [];

    audioTracks: Array<any> = [];

    constructor(public config: Record<string, any>) { mocks.instances.push(this); }

    on(event: string, callback: (...args: any[]) => void) {
      const previous = this.handlers.get(event);
      this.handlers.set(event, (...args) => { previous?.(...args); callback(...args); });
    }

    off = vi.fn();

    attachMedia(media: HTMLVideoElement) { this.media = media; media.setAttribute('src', 'blob:hls-test'); }
  }
  return { default: FakeHls };
});

const session = (id = 'one', expiresAt = Date.now() + 300000) => ({ status: 'ready', manifest: `/videos/${id}/index.m3u8?token=example`, expiresAt });
const response = (body = session(), status = 200) => new Response(JSON.stringify(body), { status });
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  mocks.instances.length = 0; mocks.supported = true;
  fetchMock = vi.fn().mockImplementation(async () => response());
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const player = () => ({ current: document.createElement('video') });

describe('Shorts HLS player', () => {
  it('loops only a confirmed HLS end stall within the fully buffered final 100 ms', async () => {
    const video = player();
    video.current.currentTime = 5.973425;
    Object.defineProperties(video.current, {
      duration: { value: 6, configurable: true },
      paused: { value: false, configurable: true },
      buffered: { value: { length: 1, start: () => 2.005333, end: () => 5.999999 }, configurable: true },
    });
    const onEnded = vi.fn(() => { video.current.currentTime = 0; });
    renderHook(() => useShortHls(video, 'one', true, () => true, undefined, { onEnded }));
    await waitFor(() => expect(mocks.instances[0].loadSource).toHaveBeenCalled());
    mocks.instances[0].bufferedToEnd = true;
    const emit = (stalled = true) => act(() => mocks.instances[0].handlers.get(Hls.Events.MEDIA_ENDED)('ended', { stalled }));
    emit(false);
    expect(onEnded).not.toHaveBeenCalled();
    emit();
    expect(onEnded).toHaveBeenCalledOnce();
    expect(video.current.currentTime).toBe(0);
    emit();
    expect(onEnded).toHaveBeenCalledOnce();
  });
  it.each(['inactive', 'manual-pause', 'paused', 'hidden', 'seeking', 'error', 'midstream', 'missing-tail', 'missing-buffer', 'disjoint-buffer', 'not-ended', 'live', 'destroyed'])('ignores an EOF recovery signal while %s', async (reason) => {
    const video = player();
    video.current.currentTime = reason === 'midstream' ? 3 : 5.973425;
    Object.defineProperties(video.current, {
      duration: { value: reason === 'live' ? Infinity : 6 },
      paused: { value: reason === 'paused' },
      seeking: { value: reason === 'seeking' },
      error: { value: reason === 'error' ? { code: 3 } : null },
      buffered: { value: { length: reason === 'missing-buffer' ? 0 : 1, start: () => (reason === 'disjoint-buffer' ? 5.99 : 2), end: () => (reason === 'missing-tail' ? 5.8 : 5.999999) } },
    });
    const onEnded = vi.fn();
    const view = renderHook(({ active }) => useShortHls(video, 'one', true, () => reason !== 'manual-pause', undefined, { active, onEnded }), { initialProps: { active: true } });
    await waitFor(() => expect(mocks.instances[0].loadSource).toHaveBeenCalled());
    mocks.instances[0].bufferedToEnd = reason !== 'not-ended';
    if (reason === 'inactive') view.rerender({ active: false });
    if (reason === 'hidden') vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    if (reason === 'destroyed') view.unmount();
    act(() => mocks.instances[0].handlers.get(Hls.Events.MEDIA_ENDED)('ended', { stalled: true }));
    expect(onEnded).not.toHaveBeenCalled();
    expect(video.current.currentTime).toBe(reason === 'midstream' ? 3 : 5.973425);
  });
  it.each([[5.973425, 6], [6, 6.166666667]])('recovers an open MediaSource stall at %s after ENDLIST, including a shifted edge of %s', async (position, edge) => {
    const video = player(); video.current.currentTime = position;
    Object.defineProperties(video.current, {
      duration: { value: 6 },
      paused: { value: false },
      buffered: { value: { length: 1, start: () => 2, end: () => 5.999999 } },
    });
    const onEnded = vi.fn(() => { video.current.currentTime = 0; });
    renderHook(() => useShortHls(video, 'one', true, () => true, undefined, { onEnded }));
    await waitFor(() => expect(mocks.instances[0].loadSource).toHaveBeenCalled());
    const hls = mocks.instances[0];
    hls.bufferedToEnd = false; hls.latestLevelDetails = { live: false, edge };
    const stall = () => act(() => hls.handlers.get(Hls.Events.ERROR)('error', { fatal: false, details: Hls.ErrorDetails.BUFFER_STALLED_ERROR }));
    stall(); expect(onEnded).not.toHaveBeenCalled();
    act(() => hls.handlers.get(Hls.Events.FRAG_BUFFERED)('buffered', {
      frag: {
        type: 'main', sn: 2, endList: true, end: edge,
      },
    }));
    stall(); expect(onEnded).toHaveBeenCalledOnce();
    expect(video.current.currentTime).toBe(0);
    stall(); expect(onEnded).toHaveBeenCalledOnce();
  });
  it.each(['live', 'missing-playlist', 'audio-only', 'not-final-fragment', 'network-error', 'source-replaced'])('does not infer final-buffer EOF from %s', async (reason) => {
    const video = player(); video.current.currentTime = 5.973425;
    Object.defineProperties(video.current, {
      duration: { value: 6 },
      paused: { value: false },
      buffered: { value: { length: 1, start: () => 2, end: () => 5.999999 } },
    });
    const onEnded = vi.fn();
    const view = renderHook(({ quality }: { quality: 'auto' | 'high' }) => useShortHls(video, 'one', true, () => true, undefined, { onEnded, quality }), { initialProps: { quality: 'auto' } });
    await waitFor(() => expect(mocks.instances[0].loadSource).toHaveBeenCalled());
    const hls = mocks.instances[0];
    hls.bufferedToEnd = false;
    hls.latestLevelDetails = reason === 'missing-playlist' ? null : { live: reason === 'live', edge: 6 };
    act(() => hls.handlers.get(Hls.Events.FRAG_BUFFERED)('buffered', {
      frag: {
        type: reason === 'audio-only' ? 'audio' : 'main',
        sn: 2,
        endList: reason !== 'not-final-fragment',
        end: 6,
      },
    }));
    if (reason === 'source-replaced') view.rerender({ quality: 'high' });
    act(() => hls.handlers.get(Hls.Events.ERROR)('error', {
      fatal: false, details: reason === 'network-error' ? Hls.ErrorDetails.FRAG_LOAD_ERROR : Hls.ErrorDetails.BUFFER_STALLED_ERROR,
    }));
    expect(onEnded).not.toHaveBeenCalled();
    expect(video.current.currentTime).toBe(5.973425);
  });
  it('attaches MediaSource playback, starts at the saved position and aborts/destroys when cold', async () => {
    const video = player(); video.current.currentTime = 3;
    const { result, rerender, unmount } = renderHook(({ warm }) => useShortHls(video, 'one', warm, () => true), { initialProps: { warm: true } });
    await waitFor(() => expect(mocks.instances[0].loadSource).toHaveBeenCalledWith('http://127.0.0.1:3335/videos/one/index.m3u8?token=example'));
    act(() => mocks.instances[0].handlers.get(Hls.Events.MANIFEST_PARSED)());
    expect(result.current.status).toBe('ready');
    expect(mocks.instances[0].startLoad).toHaveBeenCalledWith(3);
    expect(video.current.play).toHaveBeenCalled();
    expect(video.current.src).toBe('blob:hls-test');
    const { signal } = fetchMock.mock.calls[0][1];
    rerender({ warm: false });
    expect(signal.aborted).toBe(true); expect(mocks.instances[0].destroy).toHaveBeenCalled();
    expect(video.current.hasAttribute('src')).toBe(false);
    unmount();
  });
  it('does not prepare or fetch a cold/covered video', () => {
    const video = player();
    renderHook(() => useShortHls(video, 'one', false, () => false));
    expect(fetchMock).not.toHaveBeenCalled(); expect(mocks.instances).toHaveLength(0);
  });
  it('polls cold preparation, renews expiring links and preserves a manual pause', async () => {
    vi.useFakeTimers();
    fetchMock.mockResolvedValueOnce(response({ status: 'preparing' } as any, 202));
    const video = player();
    const { result, unmount } = renderHook(() => useShortHls(video, 'one', true, () => false));
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(result.current.status).toBe('preparing');
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(mocks.instances[0].loadSource).toHaveBeenCalledTimes(1);
    act(() => mocks.instances[0].handlers.get(Hls.Events.MANIFEST_PARSED)());
    expect(video.current.play).not.toHaveBeenCalled();
    video.current.currentTime = 4;
    await act(async () => { await vi.advanceTimersByTimeAsync(285000); });
    expect(mocks.instances[0].loadSource).toHaveBeenCalledTimes(2);
    act(() => mocks.instances[0].handlers.get(Hls.Events.MANIFEST_PARSED)());
    expect(mocks.instances[0].startLoad).toHaveBeenLastCalledWith(4);
    expect(video.current.play).not.toHaveBeenCalled(); unmount();
  });
  it('supports native HLS and never introduces an MP4 fallback on an unsupported browser', async () => {
    mocks.supported = false;
    const video = player();
    vi.spyOn(video.current, 'canPlayType').mockReturnValue('probably');
    const view = renderHook(() => useShortHls(video, 'one', true, () => true));
    await waitFor(() => expect(video.current.src).toContain('/index.m3u8?token='));
    act(() => video.current.dispatchEvent(new Event('loadedmetadata')));
    expect(view.result.current.status).toBe('ready'); view.unmount();
    const unsupported = player();
    const second = renderHook(() => useShortHls(unsupported, 'one', true, () => true));
    expect(second.result.current.status).toBe('error');
    expect(unsupported.current.src).toBe('');
  });
  it('shows errors and retries with a fresh session; no autoplay on an inactive player', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    const video = player();
    const { result } = renderHook(() => useShortHls(video, 'one', true, () => false));
    await waitFor(() => expect(result.current.status).toBe('error'));
    act(() => result.current.retry());
    await waitFor(() => expect(mocks.instances[1].loadSource).toHaveBeenCalledTimes(1));
    act(() => mocks.instances[1].handlers.get(Hls.Events.MANIFEST_PARSED)());
    expect(result.current.status).toBe('ready'); expect(video.current.play).not.toHaveBeenCalled();
  });
  it('refreshes an expired session after a sleeping tab, but stops after repeated failure', async () => {
    const video = player();
    const { result } = renderHook(() => useShortHls(video, 'one', true, () => true));
    await waitFor(() => expect(mocks.instances[0].loadSource).toHaveBeenCalled());
    await act(async () => mocks.instances[0].handlers.get(Hls.Events.ERROR)('error', { fatal: true, response: { code: 401 } }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    act(() => mocks.instances[0].handlers.get(Hls.Events.ERROR)('error', { fatal: true, response: { code: 401 } }));
    expect(result.current.status).toBe('error');
  });
  it('waits through session throttling without an error or overriding a pause, and cancels when cold', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(async () => new Response('', { status: 429, headers: { 'Retry-After': '3' } }));
    const video = player();
    const view = renderHook(({ warm }) => useShortHls(video, 'one', warm, () => false), { initialProps: { warm: true } });
    await act(async () => { await vi.advanceTimersByTimeAsync(2999); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(view.result.current.status).toBe('loading');
    fetchMock.mockImplementation(async () => response());
    video.current.currentTime = 4;
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    act(() => mocks.instances[0].handlers.get(Hls.Events.MANIFEST_PARSED)());
    expect(view.result.current.status).toBe('ready');
    expect(mocks.instances[0].startLoad).toHaveBeenLastCalledWith(4);
    expect(video.current.play).not.toHaveBeenCalled();
    view.unmount();
    fetchMock.mockClear().mockImplementation(async () => new Response('', { status: 503 }));
    const secondVideo = player();
    const second = renderHook(({ warm }) => useShortHls(secondVideo, 'one', warm, () => true), { initialProps: { warm: true } });
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    second.rerender({ warm: false });
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('adaptive quality and preload lifecycle', () => {
  const levels = [
    {
      width: 1080, height: 1920, frameRate: 60, bitrate: 8000000,
    },
    {
      width: 180, height: 320, frameRate: 30, bitrate: 150000,
    },
    {
      width: 480, height: 854, frameRate: 30, bitrate: 1500000,
    },
  ];
  it('defers next-item traffic, bypasses the delay on a fast swipe and cancels abandoned preloads', async () => {
    vi.useFakeTimers();
    const video = player();
    const view = renderHook(({ active }) => useShortHls(video, 'one', true, () => false, undefined, { active }), {
      initialProps: { active: false },
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(2999); });
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => { view.rerender({ active: true }); });
    expect(fetchMock).toHaveBeenCalledOnce();
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(fetchMock).toHaveBeenCalledOnce();
    view.unmount();
    const nextVideo = player();
    const next = renderHook(() => useShortHls(nextVideo, 'two', true, () => false, undefined, { active: false }));
    next.unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it('uses measured startup bandwidth and replaces queued low quality without changing manual selections', async () => {
    const video = player(); video.current.currentTime = 10;
    const view = renderHook(() => useShortHls(video, 'one', true, () => false));
    await waitFor(() => expect(mocks.instances[0].loadSource).toHaveBeenCalled());
    const engine = mocks.instances[0];
    engine.levels = [...levels, {
      width: 720, height: 1280, frameRate: 30, bitrate: 3000000,
    }];
    engine.autoLevelEnabled = true;
    act(() => engine.handlers.get(Hls.Events.MANIFEST_PARSED)());
    expect(engine.startLevel).toBe(3); expect(engine.autoLevelCapping).toBe(-1);
    expect(engine.config.maxMaxBufferLength).toBe(4);
    [0, 0].forEach((sn) => act(() => engine.handlers.get(Hls.Events.FRAG_BUFFERED)('buffered', { frag: { type: 'main', sn } })));
    expect(engine.config.abrBandWidthUpFactor).toBe(1);
    act(() => engine.handlers.get(Hls.Events.FRAG_BUFFERED)('buffered', { frag: { type: 'main', sn: 1 } }));
    expect(engine.config.abrBandWidthUpFactor).toBe(0.9);
    engine.loadLevel = 0;
    await act(async () => engine.handlers.get(Hls.Events.LEVEL_SWITCHING)('switch', { level: 0 }));
    expect(engine.config.maxMaxBufferLength).toBe(6);
    expect(engine.nextLevel).toBe(-1);
    engine.loadLevel = 2;
    act(() => engine.handlers.get(Hls.Events.LEVEL_SWITCHING)('switch', { level: 2 }));
    expect(engine.config.maxMaxBufferLength).toBe(4);
    engine.autoLevelEnabled = false; engine.nextLevel = 0; engine.loadLevel = 0;
    await act(async () => engine.handlers.get(Hls.Events.LEVEL_SWITCHING)('switch', { level: 0 }));
    expect(engine.nextLevel).toBe(0);
    expect(video.current.currentTime).toBe(10); expect(video.current.play).not.toHaveBeenCalled();
    view.unmount();
  });
  it('applies a changed preference when a previously manual video becomes warm again', async () => {
    const video = player();
    const view = renderHook(
      ({ warm, quality }) => useShortHls(video, 'one', warm, () => false, undefined, { quality }),
      { initialProps: { warm: true, quality: 'auto' as 'auto' | 'high' } },
    );
    await waitFor(() => expect(mocks.instances[0].loadSource).toHaveBeenCalled());
    mocks.instances[0].levels = levels;
    act(() => mocks.instances[0].handlers.get(Hls.Events.MANIFEST_PARSED)());
    act(() => view.result.current.selectLevel(view.result.current.choices[2].key));
    view.rerender({ warm: false, quality: 'auto' });
    view.rerender({ warm: false, quality: 'high' });
    view.rerender({ warm: true, quality: 'high' });
    await waitFor(() => expect(mocks.instances[1].loadSource).toHaveBeenCalled());
    mocks.instances[1].levels = levels;
    act(() => mocks.instances[1].handlers.get(Hls.Events.MANIFEST_PARSED)());
    expect(mocks.instances[1].startLevel).toBe(0);
    expect(view.result.current.selection).toBe('');
  });
  it('returns a manual selection to measured Auto without forcing the startup quality again', async () => {
    const video = player(); video.current.currentTime = 12;
    const view = renderHook(() => useShortHls(video, 'one', true, () => false));
    await waitFor(() => expect(mocks.instances[0].loadSource).toHaveBeenCalled());
    const engine = mocks.instances[0]; engine.levels = levels;
    act(() => engine.handlers.get(Hls.Events.MANIFEST_PARSED)());
    act(() => view.result.current.selectLevel(view.result.current.choices[0].key));
    // The bandwidth estimator now selects the rescue level after a connection drop.
    engine.nextAutoLevel = 1;
    act(() => view.result.current.resetQuality());
    expect(engine.nextLevel).toBe(-1);
    expect(engine.nextAutoLevel).toBe(1);
    expect(view.result.current.selection).toBe('');
    expect(video.current.currentTime).toBe(12);
    expect(video.current.play).not.toHaveBeenCalled();
  });
  it('caps active Data Saver even when a compatible reader returns the complete ladder', async () => {
    const video = player();
    const view = renderHook(
      ({ quality, active }) => useShortHls(video, 'one', true, () => false, undefined, { quality, active }),
      { initialProps: { quality: 'data-saver' as 'auto' | 'high' | 'data-saver', active: true } },
    );
    await waitFor(() => expect(mocks.instances[0].loadSource).toHaveBeenCalled());
    const engine = mocks.instances[0];
    engine.levels = [levels[1], { width: 360, height: 640, bitrate: 500000 }, levels[2], levels[0]];
    act(() => engine.handlers.get(Hls.Events.MANIFEST_PARSED)());
    expect(engine.startLevel).toBe(1);
    expect(engine.autoLevelCapping).toBe(1);
    expect(engine.loadLevel).toBe(-1);
    view.rerender({ quality: 'data-saver', active: false });
    expect(engine.autoLevelCapping).toBe(1);
    view.rerender({ quality: 'high', active: true });
    act(() => engine.handlers.get(Hls.Events.MANIFEST_PARSED)());
    expect(engine.startLevel).toBe(3);
    expect(engine.autoLevelCapping).toBe(-1);
    expect(engine.loadLevel).toBe(-1);
  });
  it('warms near 480, changes quality without a new session and keeps manual pause and position', async () => {
    vi.useFakeTimers();
    const video = player(); video.current.currentTime = 7;
    const view = renderHook(
      ({ quality, active }) => useShortHls(video, 'one', true, () => false, undefined, { quality, active }),
      { initialProps: { quality: 'auto' as 'auto' | 'high' | 'data-saver', active: false } },
    );
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    expect(mocks.instances[0].loadSource).toHaveBeenCalled();
    const engine = mocks.instances[0]; engine.levels = levels;
    act(() => engine.handlers.get(Hls.Events.MANIFEST_PARSED)());
    expect(engine.startLevel).toBe(2); expect(engine.config.maxBufferLength).toBe(0.5);
    expect(engine.autoLevelCapping).toBe(2);
    expect(engine.config.abrBandWidthUpFactor).toBe(1);
    expect(view.result.current.choices).toHaveLength(3);
    act(() => view.result.current.selectLevel(view.result.current.choices[0].key));
    expect(engine.nextLevel).toBe(0);
    act(() => view.result.current.resetQuality());
    expect(engine.nextLevel).toBe(-1); expect(view.result.current.selection).toBe('');
    view.rerender({ quality: 'high', active: true });
    expect(engine.loadSource).toHaveBeenLastCalledWith(expect.stringContaining('quality=high'));
    act(() => engine.handlers.get(Hls.Events.MANIFEST_PARSED)());
    expect(engine.startLevel).toBe(0); expect(engine.startLoad).toHaveBeenLastCalledWith(7);
    expect(engine.config.maxBufferLength).toBe(6); expect(engine.config.maxBufferSize).toBe(12 * 1024 * 1024);
    expect(fetchMock).toHaveBeenCalledOnce(); expect(video.current.play).not.toHaveBeenCalled();
    view.rerender({ quality: 'data-saver', active: true });
    engine.levels = [levels[1]];
    act(() => engine.handlers.get(Hls.Events.MANIFEST_PARSED)());
    expect(view.result.current.choices).toHaveLength(1);
    expect(engine.config.maxBufferSize).toBe(4 * 1024 * 1024);
    expect(engine.loadSource).toHaveBeenLastCalledWith(expect.stringContaining('quality=data-saver'));
  });
  it('keeps an available manual rendition through token renewal and preserves a seek to zero', async () => {
    vi.useFakeTimers(); const video = player(); video.current.currentTime = 4;
    fetchMock.mockImplementation(async () => response(session('one', Date.now() + 16000)));
    const view = renderHook(() => useShortHls(video, 'one', true, () => false));
    await act(async () => {});
    const engine = mocks.instances[0]; engine.levels = levels;
    act(() => engine.handlers.get(Hls.Events.MANIFEST_PARSED)());
    act(() => view.result.current.selectLevel(view.result.current.choices[0].key));
    video.current.currentTime = 0;
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    act(() => engine.handlers.get(Hls.Events.MANIFEST_PARSED)());
    expect(engine.loadLevel).toBe(0); expect(engine.startLoad).toHaveBeenLastCalledWith(0);
    expect(view.result.current.selection).toContain('1080x1920');
  });
  it('uses an audio-preserving filtered master on native HLS and cancels the old source when cold', async () => {
    mocks.supported = false;
    const video = player(); video.current.currentTime = 5;
    vi.spyOn(video.current, 'canPlayType').mockReturnValue('probably');
    const view = renderHook(
      ({ quality, warm }) => useShortHls(video, 'one', warm, () => false, undefined, { quality }),
      { initialProps: { quality: 'auto' as 'auto' | 'data-saver', warm: true } },
    );
    await waitFor(() => expect(video.current.src).toContain('index.m3u8'));
    view.rerender({ quality: 'data-saver', warm: true });
    expect(video.current.src).toContain('quality=data-saver');
    act(() => video.current.dispatchEvent(new Event('loadedmetadata')));
    expect(video.current.currentTime).toBe(5); expect(video.current.play).not.toHaveBeenCalled();
    expect(view.result.current.choices).toEqual([]);
    view.rerender({ quality: 'data-saver', warm: false });
    expect(video.current.hasAttribute('src')).toBe(false);
  });
});

describe('playback session boundary', () => {
  it.each([1, 2])('binds measured playback to a hash and obtains an opaque m%s receipt without sending the browser ID', async (version) => {
    vi.stubGlobal('crypto', webcrypto);
    const viewer = 'an-anonymous-browser-identifier';
    const value = await shortsPlaybackSession('one', new AbortController().signal, viewer);
    expect(value).toMatchObject({ token: 'example' });
    expect(fetchMock.mock.calls[0][1].headers).toEqual({ 'X-Playback-Viewer': createHash('sha256').update(viewer).digest('hex') });
    expect(JSON.stringify(fetchMock.mock.calls)).not.toContain(viewer);
    const proof = `m${version}.e30.${'a'.repeat(43)}`;
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ proof })));
    expect(await shortsPlaybackProof('one', 'example')).toBe(proof);
    expect(fetchMock).toHaveBeenLastCalledWith('http://127.0.0.1:3335/videos/one/measurement', expect.objectContaining({
      headers: { 'X-Playback-Token': 'example' }, cache: 'no-store', credentials: 'omit', keepalive: true,
    }));
    fetchMock.mockResolvedValueOnce(new Response('', { status: 401 }));
    await expect(shortsPlaybackProof('one', 'expired')).rejects.toMatchObject({ status: 401 });
  });
  it.each([
    { name: 'malformed', proof: 'not-a-proof' },
    { name: 'unknown version', proof: `m3.e30.${'a'.repeat(43)}` },
    { name: 'oversized', proof: `m2.${'a'.repeat(2048)}.${'a'.repeat(43)}` },
  ])('rejects $name receipts', async ({ proof }) => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ proof })));
    await expect(shortsPlaybackProof('one', 'example')).rejects.toThrow('Invalid');
  });
  it('bounds temporary session retries and leaves persistent failures available for manual retry', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(async () => new Response('', { status: 503 }));
    const pending = expect(shortsPlaybackSession('one', new AbortController().signal)).rejects.toThrow('unavailable');
    await vi.advanceTimersByTimeAsync(30000);
    await pending;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
  it.each([401, 403, 404, 410, 500])('does not retry session status %s', async (status) => {
    fetchMock.mockResolvedValue(new Response('', { status }));
    await expect(shortsPlaybackSession('one', new AbortController().signal)).rejects.toThrow('unavailable');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('accepts only expiring HLS links on the configured streaming origin for the requested video', async () => {
    const invalid = [
      { ...session(), manifest: 'https://other.invalid/steal' },
      { ...session(), manifest: '/videos/another/index.m3u8?token=x' },
      { ...session(), manifest: '/videos/one/video.mp4?token=x' },
      { ...session(), manifest: '/videos/one/index.m3u8' },
      { ...session(), expiresAt: Date.now() - 1 },
    ];
    await Promise.all(invalid.map(async (body) => {
      fetchMock.mockResolvedValueOnce(response(body));
      await expect(shortsPlaybackSession('one', new AbortController().signal)).rejects.toThrow();
    }));
  });
});

it('accepts a measured preparation session without treating it as playable media', async () => {
  const quality = { token: 'v2.fixture.signature', expiresAt: Date.now() + 100000 };
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ status: 'preparing', quality }), { status: 202 }));
  const video = player(); const view = renderHook(() => useShortHls(video, 'one', true, () => true));
  await waitFor(() => expect(view.result.current.token).toBe(quality.token));
  expect(view.result.current.status).toBe('preparing');
  expect(mocks.instances[0].loadSource).not.toHaveBeenCalled();
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ status: 'preparing', quality: { ...quality, expiresAt: 1 } }), { status: 202 }));
  await expect(shortsPlaybackSession('one', new AbortController().signal)).rejects.toThrow('Invalid quality measurement session');
});

it('marks an authenticated source change separately from ordinary token renewal', async () => {
  const video = player(); const observe = vi.fn();
  const reply = (hash: string) => response({ ...session(), manifest: `/videos/one/index.m3u8?token=v3.9999999999.${hash}.signature` });
  fetchMock.mockResolvedValue(reply('a'.repeat(64)));
  const view = renderHook(() => useShortHls(video, 'one', true, () => true, undefined, { observe }));
  await waitFor(() => expect(mocks.instances[0].loadSource).toHaveBeenCalled());
  expect(observe).not.toHaveBeenCalledWith({ type: 'generation' });
  fetchMock.mockResolvedValue(reply('b'.repeat(64)));
  act(() => view.result.current.retry());
  await waitFor(() => expect(observe).toHaveBeenCalledWith({ type: 'generation' }));
});
