import configs from "@/configs";
import { navRegistry } from "@/features/social/plugins/registries";

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  isExternal?: boolean;
  children?: Array<Pick<NavigationItem, "id" | "label" | "path" | "icon">>;
}

export function getNavigationItems(): NavigationItem[] {
  const core: NavigationItem[] = [
    {
      id: "home",
      label: "Social",
      path: "/",
      icon: "🏠",
    },
    configs.features.trending && {
      id: "trending",
      label: "Trends",
      path: "/trends/tokens",
      icon: "📈",
      children: [
        { id: "invite", label: "Invite & Earn", path: "/trends/invite", icon: "🎁" },
      ],
    },
    {
      id: "dex",
      label: "DeFi",
      path: "/defi",
      icon: "💱",
      children: [
        { id: "dex-swap", label: "SWAP", path: "/defi/swap", icon: "🔄" },
        { id: "dex-wrap", label: "WRAP", path: "/defi/wrap", icon: "📦" },
        { id: "dex-bridge", label: "BRIDGE", path: "/defi/bridge", icon: "🌉" },
        {
          id: "dex-buy-ae",
          label: "BUY AE",
          path: "/defi/buy-ae-with-eth",
          icon: "💎",
        },
        { id: "dex-pool", label: "POOL", path: "/defi/pool", icon: "💧" },
        {
          id: "dex-explore-tokens",
          label: "Explore Tokens",
          path: "/defi/explore/tokens",
          icon: "🪙",
        },
        {
          id: "dex-explore-pools",
          label: "Explore Pools",
          path: "/defi/explore/pools",
          icon: "🏊",
        },
        {
          id: "dex-explore-transactions",
          label: "Transactions",
          path: "/defi/explore/transactions",
          icon: "📋",
        },
      ],
    },
  ].filter(Boolean) as NavigationItem[];

  const fromPlugins: NavigationItem[] = navRegistry.map(({ id, label, path, icon }) => ({ id, label, path, icon }));
  return [...core, ...fromPlugins];
}
