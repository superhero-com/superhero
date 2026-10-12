/**
 * The iOS steps of the PWA install guide.
 *
 * Issue #688: the guide went from "tap ⋯" straight to "Add to Home Screen", but
 * that option lives in the Share sheet, so iOS 26 users were left looking for it
 * in the wrong menu. These pin Safari's real order.
 */
import React from 'react';
import {
  describe, expect, it, vi,
} from 'vitest';
import { render, screen } from '@testing-library/react';

import en from '@/locales/en.json';
import zh from '@/locales/zh.json';
import ar from '@/locales/ar.json';
import ru from '@/locales/ru.json';

vi.mock('@/utils/displayMode', () => ({
  isStandalone: () => false,
  isMobileDevice: () => true,
  isIOSWebKit: () => true,
}));

const { PwaInstallGuide } = await import('../PwaInstallGuide');

const iosSteps = en.components.pwaInstallGuide.ios;
const orderedSteps = [
  iosSteps.step1, iosSteps.step2, iosSteps.step3, iosSteps.step4, iosSteps.step5,
];

/** Every leaf key under a locale node, as dotted paths. */
const leafKeys = (node: unknown, prefix = ''): string[] => Object.entries(node as object)
  .flatMap(([key, value]) => (value && typeof value === 'object'
    ? leafKeys(value, `${prefix}${key}.`)
    : [`${prefix}${key}`]));

describe('PwaInstallGuide on iOS', () => {
  it('opens the Share menu first, then Add to Home Screen, Open as Web App and Add', () => {
    render(<PwaInstallGuide open onOpenChange={vi.fn()} />);

    const titles = orderedSteps.map((step) => screen.getByText(step.title));
    titles.slice(1).forEach((title, index) => {
      // eslint-disable-next-line no-bitwise
      expect(titles[index].compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING)
        .toBeTruthy();
    });

    expect(orderedSteps.map((step) => step.title)).toEqual([
      expect.stringMatching(/Share/),
      expect.stringMatching(/Add to Home Screen/),
      expect.stringMatching(/Open as Web App/),
      expect.stringMatching(/"Add"/),
      expect.stringMatching(/Home Screen/),
    ]);
    // Where Share is: behind ••• on iOS 26, a toolbar button before that.
    expect(screen.getByText(iosSteps.step1.description)).toBeTruthy();
    expect(iosSteps.step1.description).toMatch(/•••/);
    expect(iosSteps.step1.description).toMatch(/earlier versions/);

    expect(screen.getAllByRole('button', { name: /^Step \d+$/ })).toHaveLength(orderedSteps.length);
  });

  it('is fully translated in every shipped locale', () => {
    // A missing key falls back to English mid-dialog, so a Russian user would
    // read English steps while their iPhone shows Russian labels.
    const expected = leafKeys(en.components.pwaInstallGuide).sort();

    Object.entries({ zh, ar, ru }).forEach(([code, locale]) => {
      expect(leafKeys(locale.components.pwaInstallGuide).sort(), code).toEqual(expected);
    });
  });
});
