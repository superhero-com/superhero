import { describe, expect, it } from 'vitest';
import { qualityChoices, qualityManifest, startupQuality } from '../shorts-quality';

const levels = [
  {
    width: 1080, height: 1920, frameRate: 59.94, bitrate: 9000000,
  },
  {
    width: 180, height: 320, frameRate: 29.97, bitrate: 150000,
  },
  {
    width: 480, height: 854, frameRate: 29.97, bitrate: 1500000,
  },
  {
    width: 720, height: 1280, frameRate: 29.97, bitrate: 3000000,
  },
];
describe('Shorts playback quality policy', () => {
  it('uses actual compatible dimensions rather than a hard-coded level index', () => {
    const choices = qualityChoices(levels);
    expect(startupQuality(choices, 'auto')).toBe(3);
    expect(startupQuality(choices, 'auto', false)).toBe(2);
    expect(startupQuality(choices, 'high')).toBe(0);
    expect(startupQuality(choices, 'data-saver')).toBe(1);
    expect(choices[0].label).toBe('1080 × 1920 · 59.94 fps');
    expect(startupQuality(qualityChoices([levels[3], levels[2]]), 'auto')).toBe(0);
    expect(startupQuality(qualityChoices([levels[3], levels[2]]), 'high', false)).toBe(1);
    expect(startupQuality(qualityChoices([{ width: 160, height: 1920, bitrate: 1 }, levels[2]]), 'auto')).toBe(1);
  });
  it('does not invent resolutions for legacy/unknown levels or duplicate choices', () => {
    expect(qualityChoices([{ width: 0, height: 0, bitrate: 1 }])).toEqual([]);
    expect(qualityChoices([levels[0], levels[0]])).toHaveLength(1);
    expect(startupQuality([], 'auto')).toBe(0);
  });
  it('keeps the signed master and credentials intact when changing its served quality view', () => {
    const source = 'https://stream.example/videos/id/index.m3u8?token=a%2Bb';
    expect(qualityManifest(source, 'data-saver')).toBe(`${source}&quality=data-saver`);
    expect(qualityManifest(qualityManifest(source, 'high'), 'auto')).toBe(source);
  });
});
