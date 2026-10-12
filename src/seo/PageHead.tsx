import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Head } from './Head';

// Pages that take their <title> and meta description from the route table in src/routes.tsx
// instead of rendering their own <Head>. The copy lives in `common.views.<id>.pageTitle` and
// `common.views.<id>.pageDescription` in every locale, as "<Page> – Superhero"
// ("<Page> – Superhero DEX" for DeFi pages).
export const PAGE_HEAD_IDS = [
  'invite',
  'trendCloud',
  'daos',
  'dao',
  'daoVote',
  'accounts',
  'accountDetails',
  'createToken',
  'txQueue',
  'chat',
  'chatRelays',
  'chatDm',
  'chatRoom',
  'chatRoomInfo',
  'landing',
  'wallet',
  'meet',
  'governance',
  'terms',
  'privacy',
  'faq',
  'branding',
  'whitepaper',
  'dexWrap',
  'dexPool',
  'dexAddTokens',
  'dexExploreTokens',
  'tokenDetail',
  'dexExplorePools',
  'dexPoolDetail',
  'dexExploreTransactions',
  'dexExplore',
] as const;

export type PageHeadId = typeof PAGE_HEAD_IDS[number];

type PageHeadProps = {
  page: PageHeadId;
  // Defaults to the current path; set it when a legacy path duplicates a canonical one.
  canonicalPath?: string;
  children?: React.ReactNode;
};

export const PageHead = ({ page, canonicalPath, children }: PageHeadProps) => {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  return (
    <>
      <Head
        title={t(`common.views.${page}.pageTitle`)}
        description={t(`common.views.${page}.pageDescription`)}
        canonicalPath={canonicalPath ?? pathname}
      />
      {children}
    </>
  );
};

export default PageHead;
