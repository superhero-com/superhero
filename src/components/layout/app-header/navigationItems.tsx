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
    label: "Social", // Renamed from t('home') for clarity as per user request
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
    label: "DeFi", // t('defi')
    path: "/defi",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path>
        <line x1="12" y1="18" x2="12" y2="22"></line>
        <line x1="12" y1="2" x2="12" y2="6"></line>
      </svg>
    ),
    children: [
      { id: "dex-swap", label: t('defiChildren.swap'), path: "/defi/swap", icon: "🔄" },
      { id: "dex-wrap", label: t('defiChildren.wrap'), path: "/defi/wrap", icon: "📦" },
      { id: "dex-bridge", label: t('defiChildren.bridge'), path: "/defi/bridge", icon: "🌉" },
      {
        id: "dex-buy-ae",
        label: t('defiChildren.buyAe'),
        path: "/defi/buy-ae-with-eth",
        icon: "💎",
      },
      { id: "dex-pool", label: t('defiChildren.pool'), path: "/defi/pool", icon: "💧" },
      {
        id: "dex-explore-tokens",
        label: t('defiChildren.exploreTokens'),
        path: "/defi/explore/tokens",
        icon: "🪙",
      },
      {
        id: "dex-explore-pools",
        label: t('defiChildren.explorePools'),
        path: "/defi/explore/pools",
        icon: "🏊",
      },
      {
        id: "dex-explore-transactions",
        label: t('defiChildren.transactions'),
        path: "/defi/explore/transactions",
        icon: "📋",
      },
    ],
  },
].filter(Boolean) as NavigationItem[];
