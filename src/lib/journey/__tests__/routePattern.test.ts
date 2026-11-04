import { describe, expect, it } from 'vitest';
import { routes } from '../../../routes';
import {
  OTHER_PAGE, joinRoutePaths, sanitizePattern, toRoutePattern,
} from '../routePattern';
import { pageViewEvents } from '../pageViewEvents';

const AK = 'ak_2swhLkgBPeeADxVTAVCJnZLY5NZtCFiM93JxsEaMuC59euuFRQ';
const CT = 'ct_2AfnEfCSZCTEkxL5Yoi4Yfq6fF7YapHRaFKDJK3THMXMBspp5z';
const TH = 'th_2Kd9vGBaU2RXyvqUQSvCUM9ow8AKVPg8vRXqTQRT9Ys4vtg1jT';

const ID_LIKE = /(ak|ct|th|ok|nm)_[1-9A-HJ-NP-Za-km-z]{20,}|0x[0-9a-fA-F]{16,}/;

describe('journey route patterns', () => {
  it.each([
    ['/', '/'],
    [`/users/${AK}`, '/users/:address'],
    ['/trends/tokens/SUPERHERO', '/trends/tokens/:tokenName'],
    ['/trends/tokens', '/trends/tokens'],
    [`/trends/accounts/${AK}`, '/trends/accounts/:address'],
    [`/trends/dao/${CT}`, '/trends/dao/:saleAddress'],
    [`/trends/dao/${CT}/vote/3/${CT}`, '/trends/dao/:saleAddress/vote/:voteId/:voteAddress'],
    [`/post/${TH}_v3`, '/post/:slug'],
    ['/post/my-first-post-123', '/post/:slug'],
    [`/chat/dm/${AK}`, '/chat/dm/:address'],
    [`/chat/${CT}`, '/chat/:saleAddress'],
    [`/defi/explore/pools/${CT}`, '/defi/explore/pools/:poolAddress'],
    ['/defi/swap', '/defi/swap'],
    ['/meet/some-room', '/meet/:room'],
    ['/meet', '/meet/:room'],
    ['/profile/x/callback', '/profile/x/callback'],
    ['/trends/create', '/trends/create'],
  ])('%s -> %s', (pathname, expected) => {
    expect(toRoutePattern(pathname, routes)).toBe(expected);
  });

  it('reports unknown paths as (other), never the path itself', () => {
    expect(toRoutePattern(`/no-such-page/${AK}`, routes)).toBe(OTHER_PAGE);
    expect(toRoutePattern(`/${AK}`, routes)).toBe(OTHER_PAGE);
  });

  it('never leaks an address for any real-looking URL', () => {
    const urls = [
      `/users/${AK}`, `/user/${AK}`, `/trends/accounts/${AK}`, `/trending/accounts/${AK}`,
      `/chat/dm/${AK}`, `/explore/tokens/${CT}`, `/explore/pools/${CT}`, `/tx-queue/${TH}`,
      `/defi/explore/tokens/0x${'ab'.repeat(20)}`, `/voting/p/${CT}`,
    ];
    urls.forEach((url) => {
      const pattern = toRoutePattern(url, routes);
      expect(pattern).not.toMatch(ID_LIKE);
      expect(pattern).not.toContain(AK);
      expect(pattern.length).toBeLessThanOrEqual(96);
    });
  });

  it('sanitizes anything that does not look like a pattern', () => {
    expect(sanitizePattern(`/users/${AK}`)).toBe(OTHER_PAGE);
    expect(sanitizePattern(`/x/0x${'a'.repeat(16)}`)).toBe(OTHER_PAGE);
    expect(sanitizePattern('/users/:address?tab=1')).toBe(OTHER_PAGE);
    expect(sanitizePattern(`/${'a'.repeat(100)}`)).toBe(OTHER_PAGE);
    expect(sanitizePattern('users')).toBe(OTHER_PAGE);
    expect(sanitizePattern('/users/:address')).toBe('/users/:address');
  });

  it('joins nested route paths', () => {
    expect(joinRoutePaths(['/', 'users/:address'])).toBe('/users/:address');
    expect(joinRoutePaths(['/chat', undefined])).toBe('/chat');
    expect(joinRoutePaths(['/', undefined])).toBe('/');
  });

  it('adds profile_view and token_view on their pages', () => {
    expect(pageViewEvents('/users/:address')).toEqual(['page_view', 'profile_view']);
    expect(pageViewEvents('/trends/tokens/:tokenName')).toEqual(['page_view', 'token_view']);
    expect(pageViewEvents('/defi/swap')).toEqual(['page_view']);
  });
});
