import configs from "@/configs";

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  isExternal?: boolean;
  children?: Array<Pick<NavigationItem, "id" | "label" | "path" | "icon">>;
}

export const navigationItems: NavigationItem[] = [
  {
    id: "home",
    label: "Feed",
    path: "/",
    icon: "🏠",
  },
  {
    id: "dex",
    label: "DeFi",
    path: "/defi/swap",
    icon: "💱",
    children: [
      { id: "dex-swap", label: "SWAP", path: "/defi/swap", icon: "🔄" },
      { id: "dex-wrap", label: "WRAP", path: "/defi/wrap", icon: "📦" },
      {
        id: "dex-bridge",
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
  {
    id: "bridge ",
    label: "BRIDGE",
    path: "/bridge",
    icon: "💱",
  },
  configs.features.trendminer && {
      id: 'trending',
      label: 'Trends',
      path: '/trendminer/tokens',
      icon: '📈',
  },

  configs.features.trendminer && {
      id: 'invite',
      label: 'Invite & Earn',
      path: '/trendminer/invite',
      icon: '🎁',
  },
  // {
  //     id: 'governance',
  //     label: 'Governance & Voting',
  //     path: '/voting',
  //     icon: '🗳️',
  // },
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
];
