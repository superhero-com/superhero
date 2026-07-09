import { describe, expect, it } from 'vitest';
import { buildXComposeDeepLink, buildXComposeWebLink } from '@/utils/openXLink';

describe('openXLink builders', () => {
  const text = 'Check out @superhero_chain https://superhero.com';

  it('builds a native app deep link for the X compose screen', () => {
    const link = buildXComposeDeepLink(text);
    expect(link.startsWith('twitter://post?message=')).toBe(true);
    expect(link).toContain(encodeURIComponent(text));
  });

  it('builds a universal web fallback link on x.com', () => {
    const link = buildXComposeWebLink(text);
    expect(link.startsWith('https://x.com/intent/tweet?text=')).toBe(true);
    expect(link).toContain(encodeURIComponent(text));
  });

  it('encodes special characters in both links', () => {
    const special = 'a&b=c d';
    expect(buildXComposeDeepLink(special)).toContain('a%26b%3Dc%20d');
    expect(buildXComposeWebLink(special)).toContain('a%26b%3Dc%20d');
  });
});
