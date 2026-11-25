import { describe, expect, it } from 'vitest';
import { PresentationFreezes } from '../shorts-presentation-freezes';
import { PlaybackQuality } from '../shorts-qoe';

const frame = (time: number, frames: number, media = time / 1000) => ({
  expectedDisplayTime: time, mediaTime: media, presentedFrames: frames,
});

describe('presentation freeze measurements', () => {
  it('detects a completed freeze even while the media clock and audio keep advancing', () => {
    const detector = new PresentationFreezes(); detector.frameRate(30);
    expect(detector.observe(frame(0, 1), 1)).toBeUndefined();
    expect(detector.observe(frame(100, 4), 1)).toBe(0);
    expect(detector.observe(frame(700, 5), 1)).toBeCloseTo(600 - 1000 / 30);
  });

  it('excludes callbacks delayed by a busy main thread when frames were still presented', () => {
    const detector = new PresentationFreezes(); detector.frameRate(30);
    detector.observe(frame(0, 1), 1);
    expect(detector.observe(frame(1000, 31), 1)).toBe(0);
    expect(detector.observe(frame(1100, 34), 1)).toBe(0);
  });

  it('allows low frame rates and playback speed without treating their normal cadence as a freeze', () => {
    const detector = new PresentationFreezes(); detector.frameRate(1);
    detector.observe(frame(0, 1), 0.5);
    expect(detector.observe(frame(2000, 2, 1), 0.5)).toBe(0);
    expect(detector.observe(frame(4000, 3, 2), 0.5)).toBe(0);
    expect(detector.observe(frame(5000, 4, 3), 1)).toBeUndefined();
    expect(detector.observe(frame(6000, 5, 4), 1)).toBe(0);
  });

  it('learns native cadence before collecting and tolerates a rendition frame-rate change', () => {
    const detector = new PresentationFreezes();
    for (let i = 0; i < 4; i += 1) {
      expect(detector.observe(frame(i * 40, i + 1), 1)).toBeUndefined();
    }
    expect(detector.observe(frame(160, 5), 1)).toBe(0);
    expect(detector.observe(frame(560, 6), 1)).toBe(360);
    detector.frameRate(1);
    expect(detector.observe(frame(1560, 7), 1)).toBe(0);
  });

  it('resets across pause, seek, timestamp/counter resets and missing metadata', () => {
    const detector = new PresentationFreezes(); detector.frameRate(30);
    detector.observe(frame(0, 1), 1); detector.reset();
    expect(detector.observe(frame(10000, 2), 1)).toBeUndefined();
    expect(detector.observe(frame(10010, 1), 1)).toBeUndefined();
    expect(detector.observe(frame(10020, 2, 0), 1)).toBeUndefined();
    expect(detector.observe(frame(Number.NaN, 3), 1)).toBeUndefined();
    expect(detector.observe(frame(20000, 4), 1)).toBeUndefined();
  });

  it('keeps presentation freezes independent, cumulative and unavailable until measured', () => {
    let now = 0;
    const q = new PlaybackQuality({
      mode: 'auto', engine: 'mse', warm: false, method: 'frame',
    }, true, () => now);
    q.signal({
      type: 'switch', width: 1080, height: 1920, frameRate: 30,
    });
    expect(q.snapshot().freezeMs).toBeNull();
    now = 100; q.frame(1080, 1920, frame(now, 1) as VideoFrameCallbackMetadata);
    now = 200; q.frame(1080, 1920, frame(now, 4) as VideoFrameCallbackMetadata);
    expect(q.snapshot().freezeMs).toBe(0);
    now = 800; q.frame(1080, 1920, frame(now, 5) as VideoFrameCallbackMetadata);
    const snapshot = q.snapshot();
    expect(snapshot.version).toBe(3); expect(snapshot.freezeMs).toBe(566);
    expect(snapshot.freezes).toEqual([0, 0, 1, 0, 0, 0, 0, 0]);
    expect(snapshot.stallMs).toBe(0); expect(snapshot.playingMs).toBe(700);
    q.intent(false); now = 5000; q.intent(true);
    q.frame(1080, 1920, frame(now, 6) as VideoFrameCallbackMetadata);
    expect(q.snapshot(true).freezeMs).toBe(566);
  });
});
