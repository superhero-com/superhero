import configs from "@/configs";
import { TFunction } from 'i18next';
import { navRegistry } from "@/features/social/plugins/registries";

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  isExternal?: boolean;
  children?: Array<Pick<NavigationItem, "id" | "label" | "path" | "icon">>;
}

export const getNavigationItems = (t: TFunction): NavigationItem[] => {
  const core: NavigationItem[] = [
    {
      id: "home",
      label: t('home'),
      path: "/",
      icon: "🏠",
    },
    configs.features.trending && {
      id: "trending",
      label: t('trending'),
      path: "/trends/tokens",
      icon: "📈",
      children: [
        { id: "invite", label: t('trendingChildren.invite'), path: "/trends/invite", icon: "🎁" },
      ],
    },
    {
      id: "dex",
      label: t('defi'),
      path: "/defi",
      icon: "💱",
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

  // Add plugin-provided navigation items (plugins provide plain string labels)
  const fromPlugins: NavigationItem[] = navRegistry.map(({ id, label, path, icon }) => ({ id, label, path, icon }));
  return [...core, ...fromPlugins];
};
