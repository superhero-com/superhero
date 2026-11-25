import Hls, { LoaderContextType, type LoaderCallbacks, type LoaderContext } from 'hls.js';
import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import { ShortsHlsLoader, shortsLoadPolicy } from '../shorts-hls-loader';
import { playbackRetryDelay } from '../playback-retry';

// Exercise the installed Hls.js XHR loader, changing only its network transport.
class TestXhr {
  static sent: TestXhr[] = [];

  readyState = 0;

  status = 0;

  statusText = '';

  responseType = 'text';

  responseText = 'playlist';

  response = new ArrayBuffer(8);

  url = '';

  requestHeaders: Record<string, string> = {};

  headers: Record<string, string> = {};

  onreadystatechange: (() => void) | null = null;

  onprogress = null;

  open(_method: string, url: string) { this.url = url; this.readyState = 1; }

  setRequestHeader(name: string, value: string) { this.requestHeaders[name] = value; }

  getResponseHeader(name: string) { return this.headers[name.toLowerCase()] ?? null; }

  getAllResponseHeaders() { return Object.entries(this.headers).map(([key, value]) => `${key}: ${value}\r\n`).join(''); }

  send() { TestXhr.sent.push(this); }

  abort() { this.readyState = 0; }

  finish(status: number, header?: string) {
    this.status = status; this.readyState = 4;
    if (header) this.headers['retry-after'] = header;
    this.onreadystatechange?.();
  }
}

const loaders: ShortsHlsLoader[] = [];
beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('XMLHttpRequest', TestXhr); TestXhr.sent = []; });
afterEach(() => {
  loaders.splice(0).forEach((loader) => loader.destroy());
  vi.useRealTimers(); vi.unstubAllGlobals();
});
function load(fragment = false) {
  const policy = shortsLoadPolicy(Hls.DefaultConfig.manifestLoadPolicy).default;
  const context: LoaderContext = {
    url: `https://media.example/videos/one/${fragment ? 'segment-000.m4s' : 'index.m3u8'}?token=example`,
    type: fragment ? LoaderContextType.MEDIA_FRAGMENT : LoaderContextType.MANIFEST,
    responseType: fragment ? 'arraybuffer' : 'text',
    ...(fragment && { rangeStart: 2, rangeEnd: 10 }),
  };
  const callbacks: LoaderCallbacks<LoaderContext> = {
    onSuccess: vi.fn(), onError: vi.fn(), onTimeout: vi.fn(), onAbort: vi.fn(),
  };
  const loader = new ShortsHlsLoader(Hls.DefaultConfig);
  loaders.push(loader);
  loader.load(context, {
    loadPolicy: policy, maxRetry: 0, timeout: 20000, retryDelay: 0, maxRetryDelay: 0,
  }, callbacks);
  return { loader, callbacks, context };
}

describe('HLS backpressure recovery', () => {
  it.each([false, true])('retries the same resource and range after Retry-After (fragment: %s)', async (fragment) => {
    const { loader, callbacks, context } = load(fragment);
    const { stats } = loader;
    TestXhr.sent[0].finish(429, '3');
    await vi.advanceTimersByTimeAsync(2999);
    expect(TestXhr.sent).toHaveLength(1);
    expect(callbacks.onError).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(TestXhr.sent).toHaveLength(2);
    expect(TestXhr.sent[1].url).toBe(context.url);
    if (fragment) expect(TestXhr.sent[1].requestHeaders.Range).toBe('bytes=2-9');
    TestXhr.sent[1].finish(200);
    expect(callbacks.onSuccess).toHaveBeenCalledTimes(1);
    expect(loader.stats).toBe(stats);
    expect(callbacks.onSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ code: 200 }),
      stats,
      context,
      TestXhr.sent[1],
    );
    expect(loader.stats.retry).toBe(1);
  });
  it('waits for an HTTP-date and stops after two retries without a controller retry cycle', async () => {
    const { callbacks } = load();
    const now = Math.floor(Date.now() / 1000) * 1000;
    vi.setSystemTime(now);
    TestXhr.sent[0].finish(503, new Date(now + 5000).toUTCString());
    await vi.advanceTimersByTimeAsync(4999); expect(TestXhr.sent).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1); expect(TestXhr.sent).toHaveLength(2);
    TestXhr.sent[1].finish(503);
    await vi.advanceTimersByTimeAsync(1999); expect(TestXhr.sent).toHaveLength(2);
    await vi.advanceTimersByTimeAsync(1); expect(TestXhr.sent).toHaveLength(3);
    TestXhr.sent[2].finish(503);
    await vi.advanceTimersByTimeAsync(60000);
    expect(TestXhr.sent).toHaveLength(3); expect(callbacks.onError).toHaveBeenCalledTimes(1);
    const policy = shortsLoadPolicy(Hls.DefaultConfig.fragLoadPolicy).default.errorRetry!;
    [429, 503].forEach((code) => {
      expect(policy.shouldRetry!(policy, 0, false, { code, url: '' }, true)).toBe(false);
    });
    expect(policy.shouldRetry!(policy, 0, false, { code: 502, url: '' }, true)).toBe(true);
  });
  it.each(['abort', 'destroy'] as const)('cancels a pending retry on %s', async (action) => {
    const { loader, callbacks } = load();
    TestXhr.sent[0].finish(429, '2'); loader[action]();
    await vi.advanceTimersByTimeAsync(30000);
    expect(TestXhr.sent).toHaveLength(1); expect(callbacks.onError).not.toHaveBeenCalled();
    if (action === 'abort') expect(callbacks.onAbort).toHaveBeenCalledTimes(1);
  });
  it.each([401, 403, 404, 410])('does not retry authorization or unavailable status %s', async (status) => {
    const { callbacks } = load(); TestXhr.sent[0].finish(status, '2');
    await vi.advanceTimersByTimeAsync(30000);
    expect(TestXhr.sent).toHaveLength(1); expect(callbacks.onError).toHaveBeenCalledTimes(1);
  });
  it('does not retry earlier than a long server delay or after its recovery deadline', async () => {
    const first = load(); TestXhr.sent[0].finish(429, '60');
    expect(first.callbacks.onError).toHaveBeenCalledTimes(1);
    const second = load(); TestXhr.sent[1].finish(503, '20');
    await vi.advanceTimersByTimeAsync(20000); TestXhr.sent[2].finish(503, '20');
    await vi.advanceTimersByTimeAsync(60000);
    expect(second.callbacks.onError).toHaveBeenCalledTimes(1); expect(TestXhr.sent).toHaveLength(3);
  });
  it('uses bounded backoff for missing or malformed headers and rejects excessive delays', () => {
    [null, '', 'nonsense', '0'].forEach((header) => {
      expect(playbackRetryDelay(429, header, 0)).toBe(1000);
    });
    expect(playbackRetryDelay(503, null, 1)).toBe(2000);
    expect(playbackRetryDelay(503, '99999999999999999999999999', 0)).toBeNull();
    expect(playbackRetryDelay(429, '1', 2)).toBeNull();
  });
});
