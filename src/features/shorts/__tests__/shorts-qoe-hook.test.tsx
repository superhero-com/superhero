import { act, cleanup, renderHook } from '@testing-library/react';
import {
  afterEach, beforeEach, expect, it, vi,
} from 'vitest';
import { useShortsQoe } from '../use-shorts-qoe';
import type { QualitySnapshot } from '../shorts-qoe';

const send = vi.hoisted(() => vi.fn());
vi.mock('../shorts-media', () => ({ shortsQualityReport: send }));
let frame: VideoFrameRequestCallback;
let video: { current: HTMLVideoElement };
let token: { current: string };
beforeEach(() => {
  vi.useFakeTimers(); send.mockReset().mockResolvedValue(undefined);
  const element = document.createElement('video');
  element.requestVideoFrameCallback = vi.fn((fn) => { frame = fn; return 1; });
  element.cancelVideoFrameCallback = vi.fn();
  Object.defineProperty(element, 'videoWidth', { value: 480 }); Object.defineProperty(element, 'videoHeight', { value: 854 });
  video = { current: element }; token = { current: 'measured-fixture' };
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
const options = { mode: 'auto' as const, shouldPlay: () => true };
const display = () => frame(performance.now(), { width: 480, height: 854 } as VideoFrameCallbackMetadata);
it('does not collect or send for preloads or disabled measurement; revocation cancels in-flight work', async () => {
  const view = renderHook(
    ({ active, enabled }) => useShortsQoe(video, 'one', {
      ...options, active, enabled, token,
    }),
    { initialProps: { active: false, enabled: true } },
  );
  await act(async () => { vi.advanceTimersByTime(10000); }); expect(send).not.toHaveBeenCalled();
  view.rerender({ active: true, enabled: false });
  expect(video.current.requestVideoFrameCallback).not.toHaveBeenCalled();
  view.rerender({ active: true, enabled: true });
  await act(async () => { vi.advanceTimersByTime(100); display(); vi.advanceTimersByTime(4900); });
  expect(send).toHaveBeenCalledTimes(1);
  const body = send.mock.calls[0][2] as QualitySnapshot;
  expect(body.startupMs).toBe(100); expect(body.playingMs).toBe(4900);
  view.rerender({ active: true, enabled: false });
  expect(send.mock.calls[0][3].aborted).toBe(true);
  expect(video.current.cancelVideoFrameCallback).toHaveBeenCalled();
  await act(async () => { vi.advanceTimersByTime(20000); }); expect(send).toHaveBeenCalledTimes(1);
});
it('coalesces pending snapshots, uses a renewed token and flushes the final active window', async () => {
  let release: () => void = () => undefined;
  send.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
  const view = renderHook(
    ({ active }) => useShortsQoe(video, 'one', {
      ...options, active, enabled: true, token,
    }),
    { initialProps: { active: true } },
  );
  await act(async () => { vi.advanceTimersByTime(100); display(); vi.advanceTimersByTime(14900); });
  expect(send).toHaveBeenCalledTimes(1);
  token.current = 'renewed-fixture';
  view.rerender({ active: false });
  await act(async () => release());
  expect(send).toHaveBeenCalledTimes(2); expect(send.mock.calls[1][1]).toBe('renewed-fixture');
  expect(send.mock.calls[1][2].elapsedMs).toBe(15000);
  expect(send.mock.calls[1][2].id).toBe(send.mock.calls[0][2].id);
});
it('stops collecting after ten minutes and labels browsers without frame callbacks honestly', async () => {
  Object.defineProperty(video.current, 'requestVideoFrameCallback', { value: undefined });
  Object.defineProperty(video.current, 'paused', { value: false }); Object.defineProperty(video.current, 'readyState', { value: 3 });
  const view = renderHook(() => useShortsQoe(video, 'one', {
    ...options, active: true, enabled: true, token,
  }));
  await act(async () => { vi.advanceTimersByTime(200); video.current.dispatchEvent(new Event('playing')); vi.advanceTimersByTime(599800); });
  expect(send.mock.calls[0][2].method).toBe('playing');
  const count = send.mock.calls.length;
  await act(async () => { vi.advanceTimersByTime(60000); }); expect(send).toHaveBeenCalledTimes(count);
  view.unmount();
});

it('separates replacement media from the prior observation and sends the prior snapshot with its own token', async () => {
  const view = renderHook(() => useShortsQoe(video, 'one', {
    ...options, active: true, enabled: true, token,
  }));
  await act(async () => { vi.advanceTimersByTime(100); display(); vi.advanceTimersByTime(500); view.result.current({ type: 'generation' }); });
  expect(send.mock.calls[0][1]).toBe('measured-fixture');
  expect(send.mock.calls[0][2].origin).toBe('activation');
  token.current = 'new-source-fixture';
  await act(async () => { view.result.current({ type: 'source' }); vi.advanceTimersByTime(200); display(); vi.advanceTimersByTime(4200); });
  expect(send.mock.calls[1][1]).toBe('new-source-fixture');
  expect(send.mock.calls[1][2].origin).toBe('replacement');
  expect(send.mock.calls[1][2].id).not.toBe(send.mock.calls[0][2].id);
  expect(send.mock.calls[1][2].startupMs).toBe(200);
});

it('excludes background time and suppresses background reports even before the parent releases the player', async () => {
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  const view = renderHook(
    ({ active }) => useShortsQoe(video, 'one', {
      ...options, active, enabled: true, token,
    }),
    { initialProps: { active: true } },
  );
  await act(async () => {
    vi.advanceTimersByTime(100); display(); vi.advanceTimersByTime(100);
    hidden.mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(send).toHaveBeenCalledTimes(1); expect(send.mock.calls[0][2].playingMs).toBe(100);
  await act(async () => { vi.advanceTimersByTime(10000); }); expect(send).toHaveBeenCalledTimes(1);
  await act(async () => {
    hidden.mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(100); display(); vi.advanceTimersByTime(200);
  });
  view.rerender({ active: false });
  expect(send.mock.calls[1][2].playingMs).toBe(300);
  expect(send.mock.calls[1][2].stallMs).toBe(0);
});

it('reports a presentation freeze without waiting events and excludes paused callback gaps', async () => {
  const view = renderHook(() => useShortsQoe(video, 'one', {
    ...options, active: true, enabled: true, token,
  }));
  const present = (count: number) => frame(performance.now(), {
    width: 480,
    height: 854,
    expectedDisplayTime: performance.now(),
    mediaTime: performance.now() / 1000,
    presentedFrames: count,
  } as VideoFrameCallbackMetadata);
  await act(async () => {
    view.result.current({
      type: 'switch', width: 480, height: 854, frameRate: 30,
    });
    vi.advanceTimersByTime(100); present(1);
    vi.advanceTimersByTime(100); present(4);
    vi.advanceTimersByTime(600); present(5);
    video.current.dispatchEvent(new Event('pause'));
    vi.advanceTimersByTime(1000); present(6);
    vi.advanceTimersByTime(3200);
  });
  expect(send.mock.calls[0][2].freezeMs).toBe(566);
  expect(send.mock.calls[0][2].stallMs).toBe(0);
  expect(send.mock.calls[0][2].freezes).toEqual([0, 0, 1, 0, 0, 0, 0, 0]);
});
