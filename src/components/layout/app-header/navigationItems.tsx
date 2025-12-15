import configs from "@/configs";
import { TFunction } from 'i18next';
import React from 'react';

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  isExternal?: boolean;
  children?: Array<Pick<NavigationItem, "id" | "label" | "path" | "icon">>;
}

export const getNavigationItems = (t: TFunction): NavigationItem[] => [
  {
    id: "home",
    label: "Home",
    path: "/",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
      </svg>
    ),
  },
  configs.features.trending && {
    id: "trending",
    label: "Trends", // t('trending')
    path: "/trends/tokens",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
        <polyline points="17 6 23 6 23 12"></polyline>
      </svg>
    ),
    children: [
      { id: "leaderboard", label: t('trendingChildren.leaderboard'), path: "/trends/leaderboard", icon: "🏆" },
      { id: "invite", label: t('trendingChildren.invite'), path: "/trends/invite", icon: "🎁" },
    ],
  },
  {
    id: "dex",
    label: "Mini-Apps", // t('defi')
    path: "/apps",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"></rect>
        <rect x="14" y="3" width="7" height="7"></rect>
        <rect x="14" y="14" width="7" height="7"></rect>
        <rect x="3" y="14" width="7" height="7"></rect>
      </svg>
    ),
    children: [
      { id: "dex-swap", label: t('defiChildren.swap'), path: "/apps/swap", icon: "🔄" },
      { id: "dex-wrap", label: t('defiChildren.wrap'), path: "/apps/wrap", icon: "📦" },
      { id: "dex-bridge", label: t('defiChildren.bridge'), path: "/apps/bridge", icon: "🌉" },
      {
        id: "dex-buy-ae",
        label: t('defiChildren.buyAe'),
        path: "/apps/buy-ae-with-eth",
        icon: "💎",
      },
      { id: "dex-pool", label: t('defiChildren.pool'), path: "/apps/pool", icon: "💧" },
      {
        id: "dex-explore-tokens",
        label: t('defiChildren.exploreTokens'),
        path: "/apps/explore/tokens",
        icon: "🪙",
      },
      {
        id: "dex-explore-pools",
        label: t('defiChildren.explorePools'),
        path: "/apps/explore/pools",
        icon: "🏊",
      },
      {
        id: "dex-explore-transactions",
        label: t('defiChildren.transactions'),
        path: "/apps/explore/transactions",
        icon: "📋",
      },
    ],
  },
].filter(Boolean) as NavigationItem[];
