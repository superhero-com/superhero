import {
  afterEach, beforeEach, describe, expect, it, vi,
} from 'vitest';
import {
  createJourneyTracker,
  FLUSH_AT,
  FLUSH_INTERVAL_MS,
  isOptedOut,
  MAX_PER_REQUEST,
  QUEUE_CAP,
  type JourneyPayload,
} from '../tracker';
import { track as clientTrack } from '../client';

const ENDPOINT = 'https://api.example.test/api/analytics/journey/events';
const ANON = '3f2c8a4e-1b2d-4c3e-8f9a-0b1c2d3e4f5a';
const AK = 'ak_2swhLkgBPeeADxVTAVCJnZLY5NZtCFiM93JxsEaMuC59euuFRQ';

class FakeBlob {
  parts: string[];

  type: string;

  constructor(parts: string[], opts?: { type?: string }) {
    this.parts = parts;
    this.type = opts?.type ?? '';
  }
}

type FakeWin = ReturnType<typeof makeWin>;

function makeWin(overrides: { navigator?: Record<string, unknown>; deferIdle?: boolean } = {}) {
  const winListeners: Record<string, () => void> = {};
  const docListeners: Record<string, () => void> = {};
  const idleQueue: Array<() => void> = [];
  const win = {
    navigator: {
      doNotTrack: null as string | null,
      sendBeacon: vi.fn((...args: unknown[]) => args.length > 0),
      ...overrides.navigator,
    } as Record<string, any>,
    fetch: vi.fn((...args: unknown[]) => Promise.resolve({ status: 204, args })),
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
    clearTimeout: (t: ReturnType<typeof setTimeout>) => clearTimeout(t),
    requestIdleCallback: vi.fn((cb: () => void) => {
      if (overrides.deferIdle) idleQueue.push(cb);
      else cb();
      return 1;
    }),
    addEventListener: (type: string, fn: () => void) => { winListeners[type] = fn; },
    document: {
      visibilityState: 'visible',
      addEventListener: (type: string, fn: () => void) => { docListeners[type] = fn; },
    },
    winListeners,
    docListeners,
    idleQueue,
  };
  return win;
}

type TrackerOpts = Parameters<typeof createJourneyTracker>[0];

function makeTracker(win: FakeWin, extra: Partial<TrackerOpts> = {}) {
  let clock = 1_700_000_000_000;
  const getAnonId = vi.fn(() => ANON);
  const tracker = createJourneyTracker({
    endpoint: ENDPOINT,
    win: win as any,
    getAnonId,
    now: () => { clock += 1; return clock; },
    ...extra,
  });
  return { tracker, getAnonId };
}

const beaconPayloads = (win: FakeWin): JourneyPayload[] => win.navigator.sendBeacon.mock.calls
  .map((call: any[]) => JSON.parse((call[1] as FakeBlob).parts.join('')));

describe('journey tracker', () => {
  beforeEach(() => {
    vi.stubGlobal('Blob', FakeBlob);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('queues {n,p,t} and sends nothing before the batch size', () => {
    const win = makeWin();
    const { tracker } = makeTracker(win);
    tracker.setPage('/users/:address');
    for (let i = 0; i < FLUSH_AT - 1; i += 1) tracker.track('page_view');
    expect(win.navigator.sendBeacon).not.toHaveBeenCalled();
    expect(win.fetch).not.toHaveBeenCalled();
    expect(tracker.pending()).toHaveLength(FLUSH_AT - 1);
    expect(tracker.pending()[0]).toEqual({ n: 'page_view', p: '/users/:address', t: expect.any(Number) });
  });

  it('flushes in the background once 20 events are queued', () => {
    const win = makeWin();
    const { tracker } = makeTracker(win);
    for (let i = 0; i < FLUSH_AT; i += 1) tracker.track('page_view', { page: '/defi/swap' });
    expect(win.requestIdleCallback).toHaveBeenCalledTimes(1);
    expect(win.navigator.sendBeacon).toHaveBeenCalledTimes(1);
    const [url, blob] = win.navigator.sendBeacon.mock.calls[0] as [string, FakeBlob];
    expect(url).toBe(ENDPOINT);
    expect(blob.type).toBe('text/plain');
    expect(beaconPayloads(win)[0].e).toHaveLength(FLUSH_AT);
    expect(tracker.pending()).toHaveLength(0);
  });

  it('chunks to 50 events per request', () => {
    const win = makeWin({ deferIdle: true });
    const { tracker } = makeTracker(win);
    for (let i = 0; i < 120; i += 1) tracker.track('page_view');
    tracker.flush();
    const sizes = beaconPayloads(win).map((p) => p.e.length);
    expect(sizes).toEqual([MAX_PER_REQUEST, MAX_PER_REQUEST, 20]);
  });

  it('caps the queue and drops the oldest events', () => {
    const win = makeWin({ deferIdle: true });
    const { tracker } = makeTracker(win);
    for (let i = 0; i < QUEUE_CAP + 30; i += 1) tracker.track('page_view');
    const pending = tracker.pending();
    expect(pending).toHaveLength(QUEUE_CAP);
    // the first 30 timestamps are gone
    expect(pending[0].t).toBe(1_700_000_000_000 + 31);
  });

  it('sends with a beacon on pagehide and when the tab is hidden', () => {
    const win = makeWin();
    const { tracker } = makeTracker(win);
    tracker.track('profile_edit_open');
    win.winListeners.pagehide();
    expect(win.navigator.sendBeacon).toHaveBeenCalledTimes(1);

    tracker.track('claim_account_open');
    win.document.visibilityState = 'hidden';
    win.docListeners.visibilitychange();
    expect(win.navigator.sendBeacon).toHaveBeenCalledTimes(2);
    expect(beaconPayloads(win).map((p) => p.e[0].n)).toEqual(['profile_edit_open', 'claim_account_open']);
  });

  it('sends on the 10 s idle timer', () => {
    vi.useFakeTimers();
    const win = makeWin();
    const { tracker } = makeTracker(win);
    tracker.track('post_created');
    vi.advanceTimersByTime(FLUSH_INTERVAL_MS - 1);
    expect(win.navigator.sendBeacon).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(win.requestIdleCallback).toHaveBeenCalled();
    expect(win.navigator.sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('falls back to setTimeout when requestIdleCallback is missing', () => {
    vi.useFakeTimers();
    const win = makeWin();
    (win as any).requestIdleCallback = undefined;
    const { tracker } = makeTracker(win);
    for (let i = 0; i < FLUSH_AT; i += 1) tracker.track('page_view');
    expect(win.navigator.sendBeacon).not.toHaveBeenCalled();
    vi.advanceTimersByTime(0);
    expect(win.navigator.sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('falls back to a keepalive fetch without credentials when there is no beacon', () => {
    const win = makeWin({ navigator: { sendBeacon: undefined } });
    const { tracker } = makeTracker(win);
    tracker.track('token_created');
    tracker.flush();
    expect(win.fetch).toHaveBeenCalledTimes(1);
    const [url, init] = win.fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(ENDPOINT);
    expect(init).toMatchObject({
      method: 'POST',
      keepalive: true,
      credentials: 'omit',
      mode: 'cors',
      headers: { 'Content-Type': 'text/plain' },
    });
    expect(JSON.parse(init.body as string).e[0].n).toBe('token_created');
  });

  it('falls back to fetch when the beacon is refused', () => {
    const win = makeWin({ navigator: { sendBeacon: vi.fn(() => false) } });
    const { tracker } = makeTracker(win);
    tracker.track('swap_done');
    tracker.flush();
    expect(win.fetch).toHaveBeenCalledTimes(1);
  });

  it('never throws when sendBeacon and fetch throw or reject', async () => {
    const win = makeWin({ navigator: { sendBeacon: vi.fn(() => { throw new Error('beacon'); }) } });
    win.fetch.mockImplementationOnce(() => { throw new Error('fetch sync'); });
    win.fetch.mockImplementationOnce(() => Promise.reject(new Error('fetch async')));
    const { tracker } = makeTracker(win);
    expect(() => {
      tracker.track('tip_sent');
      tracker.flush();
      tracker.track('tip_sent');
      tracker.flush();
      win.winListeners.pagehide();
    }).not.toThrow();
    await Promise.resolve();
    expect(win.fetch).toHaveBeenCalledTimes(2);
  });

  it('sends a payload of only v / a / e{n,p,t}, with no address anywhere', () => {
    const win = makeWin();
    const { tracker } = makeTracker(win);
    tracker.setPage(`/users/${AK}`); // a real path must never get through
    tracker.track('profile_view');
    tracker.track('x_connect_start', { page: '/users/:address' });
    tracker.flush();
    const raw = (win.navigator.sendBeacon.mock.calls[0][1] as FakeBlob).parts.join('');
    const payload = JSON.parse(raw);
    expect(Object.keys(payload).sort()).toEqual(['a', 'e', 'v']);
    expect(payload.v).toBe(1);
    expect(payload.a).toBe(ANON);
    payload.e.forEach((e: Record<string, unknown>) => {
      expect(Object.keys(e).sort()).toEqual(['n', 'p', 't']);
      expect(typeof e.t).toBe('number');
    });
    expect(payload.e.map((e: any) => e.p)).toEqual(['(other)', '/users/:address']);
    expect(raw).not.toMatch(/ak_/);
  });

  it('drops event names outside the allowlist', () => {
    const win = makeWin();
    const { tracker } = makeTracker(win);
    tracker.track('wallet_address_seen' as any);
    expect(tracker.pending()).toHaveLength(0);
  });

  describe('opt-out', () => {
    it.each([
      ['Do Not Track', { navigator: { doNotTrack: '1' } }, {}],
      ['Global Privacy Control', { navigator: { globalPrivacyControl: true } }, {}],
      ['VITE_JOURNEY_ANALYTICS=false', {}, { envFlag: 'false' }],
      ['no API configured', {}, { endpoint: null }],
      ['disabled (tests / SSR)', {}, { disabled: true }],
    ])('%s: nothing is queued or sent and no id is created', (_label, winOpts, trackerOpts) => {
      const win = makeWin(winOpts as any);
      const { tracker, getAnonId } = makeTracker(win, trackerOpts as any);
      tracker.track('page_view');
      tracker.flush();
      win.winListeners.pagehide?.();
      expect(tracker.isEnabled()).toBe(false);
      expect(tracker.pending()).toHaveLength(0);
      expect(getAnonId).not.toHaveBeenCalled();
      expect(win.navigator.sendBeacon).not.toHaveBeenCalled();
      expect(win.fetch).not.toHaveBeenCalled();
    });

    it('reads DNT and GPC', () => {
      expect(isOptedOut({ doNotTrack: '1' })).toBe(true);
      expect(isOptedOut({ globalPrivacyControl: true })).toBe(true);
      expect(isOptedOut({ doNotTrack: '0' })).toBe(false);
      expect(isOptedOut({}, 'false')).toBe(true);
      expect(isOptedOut({}, 'true')).toBe(false);
    });
  });

  it('the app-level track() is a silent no-op under tests', () => {
    const beacon = vi.fn(() => true);
    const fetchSpy = vi.fn(() => Promise.resolve(new Response(null, { status: 204 })));
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: beacon });
    vi.stubGlobal('fetch', fetchSpy);
    expect(() => clientTrack('page_view')).not.toThrow();
    expect(beacon).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
