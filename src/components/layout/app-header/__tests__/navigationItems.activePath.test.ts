import { describe, expect, it } from 'vitest';
import {
  getActiveNavigationPath,
  getMobileMoreNavigationItems,
  getNavigationItems,
} from '../navigationItems';

describe('getActiveNavigationPath', () => {
  const items = getNavigationItems();

  it.each([
    ['/trends/daos', '/trends/daos'],
    ['/trends/dao/ct_sale', '/trends/daos'],
    ['/trends/dao/ct_sale/vote/1/ct_vote', '/trends/daos'],
    ['/voting', '/trends/daos'],
    ['/voting/p/ct_poll', '/trends/daos'],
    ['/trends/tokens/FOO', '/trends/tokens'],
    ['/', '/'],
  ])('marks %s under %s', (pathname, expected) => {
    expect(getActiveNavigationPath(pathname, items)).toBe(expected);
  });

  it('does not treat a shared prefix as a section match', () => {
    expect(getActiveNavigationPath('/votingsomething', items)).toBeUndefined();
  });

  it('marks the mobile "More" menu on the governance polls', () => {
    expect(getActiveNavigationPath('/voting', getMobileMoreNavigationItems())).toBe('/trends/daos');
  });
});
