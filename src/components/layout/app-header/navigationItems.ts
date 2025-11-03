import configs from "@/configs";
import { TFunction } from 'i18next';

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  isExternal?: boolean;
  children?: Array<Pick<NavigationItem, "id" | "label" | "path" | "icon">>;
}

export const getNavigationItems = (t: TFunction): NavigationItem[] => [
  {
    id: "home",
    label: t('navigation.home'),
    path: "/",
    icon: "🏠",
  },
  configs.features.trending && {
    id: "trending",
    label: t('navigation.trending'),
    path: "/trends/tokens",
    icon: "📈",
    children: [
      { id: "invite", label: t('navigation.trendingChildren.invite'), path: "/trends/invite", icon: "🎁" },
    ],
  },
  {
    id: "dex",
    label: t('navigation.defi'),
    path: "/defi",
    icon: "💱",
    children: [
      { id: "dex-swap", label: t('navigation.defiChildren.swap'), path: "/defi/swap", icon: "🔄" },
      { id: "dex-wrap", label: t('navigation.defiChildren.wrap'), path: "/defi/wrap", icon: "📦" },
      { id: "dex-bridge", label: t('navigation.defiChildren.bridge'), path: "/defi/bridge", icon: "🌉" },
      {
        id: "dex-buy-ae",
        label: t('navigation.defiChildren.buyAe'),
        path: "/defi/buy-ae-with-eth",
        icon: "💎",
      },
      { id: "dex-pool", label: t('navigation.defiChildren.pool'), path: "/defi/pool", icon: "💧" },
      {
        id: "dex-explore-tokens",
        label: t('navigation.defiChildren.exploreTokens'),
        path: "/defi/explore/tokens",
        icon: "🪙",
      },
      {
        id: "dex-explore-pools",
        label: t('navigation.defiChildren.explorePools'),
        path: "/defi/explore/pools",
        icon: "🏊",
      },
      {
        id: "dex-explore-transactions",
        label: t('navigation.defiChildren.transactions'),
        path: "/defi/explore/transactions",
        icon: "📋",
      },
    ],
  },
  // {
  //     id: 'landing',
  //     label: 'Info',
  //     path: '/landing',
  //     icon: 'ℹ️',
  // },
  // {
  //     id: 'github',
  //     label: 'GitHub',
  //     path: 'https://github.com/aeternity/superhero-ui',
  //     icon: '🐙',
  //     isExternal: true,
  // },
].filter(Boolean) as NavigationItem[];
