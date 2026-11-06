import {
  describe, it, expect, vi,
} from 'vitest';

describe('Shorts feature flag', () => {
  it.each([undefined, '', 'false', '1', 'TRUE', 'true'])('only exact true enables navigation (%s)', async (value) => {
    vi.resetModules();
    vi.stubEnv('ENABLE_SHORTS', value);
    const { SHORTS_ENABLED } = await import('@/shorts-enabled');
    const { getNavigationItems, getMobileMoreNavigationItems } = await import('@/components/layout/app-header/navigationItems');
    expect(SHORTS_ENABLED).toBe(value === 'true');
    expect(getNavigationItems().some((item) => item.id === 'shorts')).toBe(value === 'true');
    expect(getMobileMoreNavigationItems().some((item) => item.id === 'shorts')).toBe(value === 'true');
  });
});
