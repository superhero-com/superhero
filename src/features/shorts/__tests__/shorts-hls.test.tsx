import {
  act, cleanup, renderHook, waitFor,
} from '@testing-library/react';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import Hls from 'hls.js';
import { useShortHls } from '../use-short-hls';
import { shortsPlaybackSession } from '../shorts-media';

const mocks = vi.hoisted(() => ({ instances: [] as Array<any>, supported: true }));
vi.mock('hls.js', () => {
  type Handler = (...args: any[]) => void;
  class FakeHls {
    static Events = { MANIFEST_PARSED: 'manifest', ERROR: 'error', FRAG_BUFFERED: 'buffered' };

    static isSupported = () => mocks.supported;

    handlers = new Map<string, Handler>();

    media?: HTMLVideoElement;

    loadSource = vi.fn();

    startLoad = vi.fn();

    stopLoad = vi.fn();

    destroy = vi.fn();

    constructor() { mocks.instances.push(this); }

    on(event: string, callback: (...args: any[]) => void) { this.handlers.set(event, callback); }

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
});

describe('playback session boundary', () => {
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
