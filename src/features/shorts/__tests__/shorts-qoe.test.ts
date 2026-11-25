import { describe, expect, it } from 'vitest';
import { PlaybackQuality } from '../shorts-qoe';

const settings = {
  mode: 'auto' as const, engine: 'mse' as const, warm: false, method: 'frame' as const,
};
const fixture = (expected = true) => {
  let clock = 0;
  const quality = new PlaybackQuality(settings, expected, () => clock);
  return { quality, at: (ms: number) => { clock = ms; } };
};
describe('playback quality measurements', () => {
  it('measures rendered first frame and rendition time, excluding pause and user seek', () => {
    const { quality: q, at } = fixture();
    at(100); q.frame(480, 854);
    at(600); q.intent(false);
    at(5000); q.intent(true);
    at(5100); q.frame(480, 854);
    at(5200); q.seek(true);
    at(7000); q.seek(false);
    at(7100); q.frame(480, 854);
    at(7200); const value = q.snapshot(true);
    expect(value.startupMs).toBe(100);
    expect(value.playingMs).toBe(700);
    expect(value.renditionMs).toEqual([0, 0, 0, 700, 0, 0, 0]);
    expect(value.stallMs).toBe(0);
  });
  it('counts only stalls at least 250ms, including a final unfinished stall exactly once', () => {
    const { quality: q, at } = fixture();
    at(100); q.frame(1080, 1920);
    at(200); q.wait(); at(449); q.frame(1080, 1920);
    at(500); q.wait(); at(900); const during = q.snapshot();
    expect(during.stallMs).toBe(400); expect(during.stalls.reduce((a, b) => a + b)).toBe(0);
    at(1000); q.intent(false); const after = q.snapshot();
    expect(after.stallMs).toBe(500); expect(after.stalls[1]).toBe(1);
    at(5000); expect(q.snapshot(true).stallMs).toBe(500);
  });
  it('times switches to the displayed frame rather than the downloaded level', () => {
    const { quality: q, at } = fixture();
    at(100); q.frame(480, 854);
    at(200); q.signal({ type: 'switch', width: 1080, height: 1920 });
    at(300); q.frame(480, 854);
    at(900); q.frame(1080, 1920);
    const value = q.snapshot();
    expect(value.switchCount).toBe(1); expect(value.switchMs).toBe(700); expect(value.switches[2]).toBe(1);
    expect(value.width).toBe(1080); expect(value.height).toBe(1920);
  });
  it('keeps transport reload buffering measurable and ignores same-resolution switches', () => {
    const { quality: q, at } = fixture();
    at(100); q.frame(480, 854); at(200); q.signal({ type: 'source' });
    q.seek(true); at(800); q.seek(false); q.frame(480, 854);
    const value = q.snapshot(); expect(value.stallMs).toBe(600); expect(value.switchCount).toBe(0);
  });
  it('ignores preloaded frames and explicitly paused startup, and distinguishes unsupported counters', () => {
    const { quality: q, at } = fixture(false);
    q.frames({ totalVideoFrames: 20, droppedVideoFrames: 2 });
    at(2000); q.frame(360, 640); expect(q.snapshot().startupMs).toBe(-1);
    q.intent(true); at(2100); q.frame(360, 640);
    q.frames({ totalVideoFrames: 30, droppedVideoFrames: 3 });
    q.frames({ totalVideoFrames: 0, droppedVideoFrames: 0 });
    q.frames({ totalVideoFrames: 5, droppedVideoFrames: 1 });
    const value = q.snapshot(); expect(value.startupMs).toBe(100);
    expect(value.totalFrames).toBe(15); expect(value.droppedFrames).toBe(2);
  });
  it('bounds the window, latches a safe fatal category and never stores source strings', () => {
    const { quality: q, at } = fixture();
    at(100); q.frame(1920, 1080); at(200); q.signal({ type: 'fatal', reason: 'network' });
    q.signal({ type: 'fatal', reason: 'media' });
    at(800000); const value = q.snapshot(true);
    expect(value.elapsedMs).toBe(600000); expect(value.fatal).toBe('network');
    expect(Object.keys(value)).not.toEqual(expect.arrayContaining(['url', 'wallet', 'source', 'token']));
  });
});
