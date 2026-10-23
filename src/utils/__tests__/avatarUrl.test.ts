import { describe, expect, it } from 'vitest';
import { getLinkedAvatarUrl } from '@/api/backend';
import { isValidAvatarUrl } from '../avatarUrl';

describe('isValidAvatarUrl', () => {
  it.each([
    'https://example.com/me.png',
    'https://cdn.example.com/u/Me.JPEG?v=2',
    'https://i.imgur.com/abc123',
  ])('accepts %s', (value) => {
    expect(isValidAvatarUrl(value)).toBe(true);
  });

  it.each([
    '',
    'http://example.com/me.png',
    'https://example.com:8443/me.png',
    'https://example.com/',
    'https://example.com/page.html',
    'data:image/png;base64,AAAA',
    `https://example.com/${'a'.repeat(200)}.png`,
  ])('rejects %s', (value) => {
    expect(isValidAvatarUrl(value)).toBe(false);
  });
});

describe('getLinkedAvatarUrl', () => {
  it('serves links.avatar over https', () => {
    expect(getLinkedAvatarUrl({ links: { avatar: 'example.com/me.png' } })).toBe(
      'https://example.com/me.png',
    );
  });

  it('falls back to an https profile.avatarurl', () => {
    expect(getLinkedAvatarUrl({
      links: {},
      profile: { avatarurl: 'https://example.com/old.png' } as never,
    })).toBe('https://example.com/old.png');
  });

  it('returns null when nothing is set or the fallback is not https', () => {
    expect(getLinkedAvatarUrl(null)).toBeNull();
    expect(getLinkedAvatarUrl({
      links: {},
      profile: { avatarurl: 'http://example.com/old.png' } as never,
    })).toBeNull();
  });
});
