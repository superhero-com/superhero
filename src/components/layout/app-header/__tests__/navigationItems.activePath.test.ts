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
    ['/voting', '/voting'],
    ['/voting/p/ct_poll', '/voting'],
    ['/voting/create', '/voting'],
    ['/voting/account', '/voting'],
    ['/trends/tokens/FOO', '/trends/tokens'],
    ['/', '/'],
  ])('marks %s under %s', (pathname, expected) => {
    expect(getActiveNavigationPath(pathname, items)).toBe(expected);
  });

  it('exposes separate DAO and Governance destinations on desktop and mobile', () => {
    const expected = [
      expect.objectContaining({ id: 'dao', labelKey: 'nav.dao', path: '/trends/daos' }),
      expect.objectContaining({ id: 'governance', labelKey: 'nav.governance', path: '/voting' }),
    ];
    expect(items.filter(({ id }) => ['dao', 'governance'].includes(id))).toEqual(expected);
    const mobileItems = getMobileMoreNavigationItems();
    expect(mobileItems.filter(({ id }) => ['dao', 'governance'].includes(id))).toEqual(expected);
    expect(getActiveNavigationPath('/trends/dao/ct_sale', mobileItems)).toBe('/trends/daos');
  });

  it('does not treat a shared prefix as a section match', () => {
    expect(getActiveNavigationPath('/votingsomething', items)).toBeUndefined();
  });

  it('marks the mobile "More" menu on the governance polls', () => {
    expect(getActiveNavigationPath('/voting', getMobileMoreNavigationItems())).toBe('/voting');
  });
});
