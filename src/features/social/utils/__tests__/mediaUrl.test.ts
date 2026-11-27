import { describe, expect, it } from 'vitest';
import { isVideoMediaUrl, normalizeMediaUrl } from '../mediaUrl';

describe('normalizeMediaUrl', () => {
  it('accepts direct image and video links', () => {
    expect(normalizeMediaUrl(' https://example.com/a/cat.PNG ')).toBe('https://example.com/a/cat.PNG');
    expect(normalizeMediaUrl('https://cdn.example.com/clip.mp4?x=1')).toBe('https://cdn.example.com/clip.mp4?x=1');
    expect(normalizeMediaUrl('https://i.imgur.com/abc.jpeg')).toBe('https://i.imgur.com/abc.jpeg');
  });

  it('stores http links as https', () => {
    expect(normalizeMediaUrl('http://example.com/a.png')).toBe('https://example.com/a.png');
  });

  it('rejects page links from media hosts, which cannot render as media', () => {
    expect(normalizeMediaUrl('https://www.youtube.com/watch?v=abc')).toBeNull();
    expect(normalizeMediaUrl('https://vimeo.com/123456')).toBeNull();
    expect(normalizeMediaUrl('https://imgur.com/gallery/abc')).toBeNull();
    expect(normalizeMediaUrl('https://i.imgur.com/abc')).toBeNull();
    expect(normalizeMediaUrl('https://giphy.com/gifs/abc')).toBeNull();
  });

  it('rejects non-media links, bad protocols and garbage', () => {
    expect(normalizeMediaUrl('https://example.com/page')).toBeNull();
    expect(normalizeMediaUrl('https://example.com/a.png.html')).toBeNull();
    expect(normalizeMediaUrl(['javascript', ':alert(1)//x.png'].join(''))).toBeNull();
    expect(normalizeMediaUrl('ftp://example.com/a.png')).toBeNull();
    expect(normalizeMediaUrl('not a url')).toBeNull();
    expect(normalizeMediaUrl('   ')).toBeNull();
    expect(normalizeMediaUrl('')).toBeNull();
  });
});

describe('isVideoMediaUrl', () => {
  it('detects video by path, ignoring query and hash', () => {
    expect(isVideoMediaUrl('https://x.com/a.mp4?w=1')).toBe(true);
    expect(isVideoMediaUrl('https://x.com/a.gif#w=1&h=2')).toBe(false);
    expect(isVideoMediaUrl('https://x.com/a.png?f=b.mp4')).toBe(false);
  });
});
