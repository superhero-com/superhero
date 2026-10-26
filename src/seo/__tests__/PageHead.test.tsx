import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, type RouteObject } from 'react-router-dom';
import {
  afterEach, describe, expect, it, vi,
} from 'vitest';
import { changeLanguage } from '../../i18n';
import en from '../../locales/en.json';
import zh from '../../locales/zh.json';
import ar from '../../locales/ar.json';
import ru from '../../locales/ru.json';
import { PAGE_HEAD_IDS, PageHead } from '../PageHead';

// The layout pulls in the whole shell; the route table only needs its identity.
vi.mock('../../components/layout/SocialLayout', () => ({ default: () => null }));

const metaContent = (selector: string) => document.head.querySelector(selector)?.getAttribute('content');

afterEach(async () => {
  await changeLanguage('en');
});

describe('PageHead', () => {
  it('sets the translated title, description and canonical URL for the page', () => {
    render(
      <MemoryRouter initialEntries={['/defi/pool?from=AE&to=ct_token']}>
        <PageHead page="dexPool">
          <p>Pool page</p>
        </PageHead>
      </MemoryRouter>,
    );

    expect(document.title).toBe('Provide Liquidity – Superhero DEX');
    expect(metaContent('meta[name="description"]')).toBe(
      'Add liquidity to token pairs and manage your positions on Superhero DEX.',
    );
    expect(metaContent('meta[property="og:title"]')).toBe('Provide Liquidity – Superhero DEX');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'))
      .toBe('https://superhero.com/defi/pool');
  });

  it('points a legacy path at its canonical page and follows the interface language', async () => {
    await changeLanguage('zh');
    render(
      <MemoryRouter initialEntries={['/trends/invite']}>
        <PageHead page="invite" canonicalPath="/trends/invite" />
      </MemoryRouter>,
    );

    expect(document.title).toBe('邀请赚奖励 – Superhero');
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'))
      .toBe('https://superhero.com/trends/invite');
  });

  it.each(Object.entries({
    en, zh, ar, ru,
  }))('has a "<Page> – Superhero" title and a short description for every page in %s', (_lang, locale) => {
    const views = (locale as any).common.views as Record<string, Record<string, string>>;
    PAGE_HEAD_IDS.forEach((page) => {
      expect(views[page]?.pageTitle, page).toMatch(/^\S.* – Superhero( DEX)?$/);
      expect(views[page]?.pageDescription, page).toBeTruthy();
      expect(views[page].pageDescription.length, page).toBeLessThanOrEqual(160);
    });
  });
});

describe('route titles', () => {
  // Pages that render their own <Head> (with data-driven titles), plus routes that never show
  // a page of their own: the X OAuth callback and the dev-only wallet lab.
  const OWN_HEAD_OR_EXEMPT = new Set([
    'index', 'post/:slug', 'users/:address', '/trends/tokens', '/trends/tokens/:tokenName',
    '/trends/leaderboard', '/defi/swap', '/get-ae', '*', '/profile/x/callback', '/wallet-lab',
  ]);

  const isRedirect = (element: React.ReactElement) => {
    const name = (element.type as { name?: string }).name || '';
    return name.startsWith('Navigate');
  };

  const hasPageHead = (node: React.ReactNode): boolean => {
    if (!React.isValidElement(node)) return false;
    if (node.type === PageHead) return true;
    const { children } = node.props as { children?: React.ReactNode };
    return React.Children.toArray(children).some(hasPageHead);
  };

  const leafRoutes = (list: RouteObject[]): RouteObject[] => list.flatMap(
    (route) => (route.children ? leafRoutes(route.children) : [route]),
  );

  it('gives every page route a title', async () => {
    const { routes } = await import('../../routes');
    const untitled = leafRoutes(routes)
      .filter((route) => !OWN_HEAD_OR_EXEMPT.has(route.index ? 'index' : String(route.path)))
      .filter((route) => !isRedirect(route.element as React.ReactElement))
      .filter((route) => !hasPageHead(route.element))
      .map((route) => route.path);

    expect(untitled).toEqual([]);
  });
});
