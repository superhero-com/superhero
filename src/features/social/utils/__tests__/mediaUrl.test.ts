import { describe, expect, it } from 'vitest';
import { isVideoMediaUrl, normalizeMediaUrl } from '../mediaUrl';

describe('normalizeMediaUrl', () => {
  it('accepts direct image and video links', () => {
    expect(normalizeMediaUrl(' https://example.com/a/cat.PNG ')).toBe('https://example.com/a/cat.PNG');
    expect(normalizeMediaUrl('https://cdn.example.com/clip.mp4?x=1')).toBe('https://cdn.example.com/clip.mp4?x=1');
  });

  it('accepts known media hosts without an extension', () => {
    expect(normalizeMediaUrl('https://i.imgur.com/abc')).toBe('https://i.imgur.com/abc');
    expect(normalizeMediaUrl('https://media.giphy.com/media/xyz/giphy')).not.toBeNull();
  });

  it('rejects non-media links, bad protocols and garbage', () => {
    expect(normalizeMediaUrl('https://example.com/page')).toBeNull();
    expect(normalizeMediaUrl(['javascript', ':alert(1)//x.png'].join(''))).toBeNull();
    expect(normalizeMediaUrl('ftp://example.com/a.png')).toBeNull();
    expect(normalizeMediaUrl('not a url')).toBeNull();
    expect(normalizeMediaUrl('')).toBeNull();
    expect(normalizeMediaUrl('https://notimgur.com/abc')).toBeNull();
  });
});

describe('isVideoMediaUrl', () => {
  it('detects video by path, ignoring query and hash', () => {
    expect(isVideoMediaUrl('https://x.com/a.mp4?w=1')).toBe(true);
    expect(isVideoMediaUrl('https://x.com/a.gif#w=1&h=2')).toBe(false);
  });
});
