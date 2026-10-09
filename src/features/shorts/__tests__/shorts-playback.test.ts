import {
  afterEach, describe, expect, it, vi,
} from 'vitest';
import { PlaybackDelivery, type PlaybackResult } from '../shorts-playback';
import { PlaybackProgress } from '../shorts-playback-progress';
import { ShortsApiError } from '../api';

afterEach(() => vi.useRealTimers());
describe('measured playback', () => {
  it('counts unique visible playback and excludes seeks, pauses, background time and repeated fragments', () => {
    const progress = new PlaybackProgress(10);
    progress.resetPosition(0, 0);
    expect(progress.sample(1, true, 1000)).toBe(1);
    expect(progress.sample(2, true, 2000)).toBe(2);
    progress.resetPosition(0, 2000);
    progress.sample(1, true, 3000);
    expect(progress.sample(2, true, 4000)).toBe(2);
    expect(progress.sample(8, true, 4500)).toBe(2);
    expect(progress.sample(9, false, 5500)).toBe(2);
    progress.resetPosition(9, 6000);
    expect(progress.sample(10, true, 7000)).toBe(3);
  });
  it('caps a full loop at the clip length', () => {
    const progress = new PlaybackProgress(3);
    progress.resetPosition(0, 0);
    for (let loop = 0; loop < 3; loop += 1) {
      progress.resetPosition(0, loop * 3000);
      for (let n = 1; n <= 3; n += 1) progress.sample(n, true, loop * 3000 + n * 1000);
    }
    expect(progress.seconds).toBe(3);
  });
  it('retries the same start event, coalesces progress and sends the final fraction', async () => {
    vi.useFakeTimers();
    const result = { accepted: true, views: 1, engagement: { score: 0.5 } };
    const send = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(result);
    const confirm = vi.fn();
    const delivery = new PlaybackDelivery(send, confirm);
    const payload = {
      id: 'stable-event', session: 'browser', source: 'for-you', seconds: 0,
    };
    delivery.enqueue('short', payload);
    delivery.enqueue('short', { ...payload, seconds: 2 });
    delivery.enqueue('short', { ...payload, seconds: 2.7 });
    await vi.advanceTimersByTimeAsync(500);
    expect(send.mock.calls.map((call) => call[1].seconds)).toEqual([0, 0, 2.7]);
    expect(send.mock.calls.every((call) => call[1].id === payload.id)).toBe(true);
    expect(confirm).toHaveBeenLastCalledWith('short', result);
    delivery.dispose();
  });
  it('stops retries and ignores late responses when the player session ends', async () => {
    vi.useFakeTimers();
    let resolve: (value: PlaybackResult) => void = () => undefined;
    const send = vi.fn(() => new Promise<PlaybackResult>((done) => { resolve = done; }));
    const confirm = vi.fn();
    const delivery = new PlaybackDelivery(send, confirm);
    const payload = {
      id: 'event', session: 'browser', source: 'saved', seconds: 3,
    };
    delivery.enqueue('short', payload);
    delivery.dispose();
    resolve({ accepted: true, views: 1, engagement: { score: 0.5 } });
    await vi.runAllTimersAsync();
    delivery.enqueue('short', payload);
    expect(send).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
  });
  it('does not retry invalid or refused measurements', async () => {
    vi.useFakeTimers();
    const send = vi.fn().mockRejectedValue(new ShortsApiError('Unavailable', 400));
    const delivery = new PlaybackDelivery(send, vi.fn());
    delivery.enqueue('short', {
      id: 'event', session: 'browser', source: 'saved', seconds: 2,
    });
    await vi.runAllTimersAsync();
    expect(send).toHaveBeenCalledTimes(1);
    delivery.dispose();
  });
});
