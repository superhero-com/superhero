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
    label: "Home",
    path: "/",
    icon: "🏠",
  },
  {
    id: "dex",
    label: "DEX",
    path: "/dex/swap",
    icon: "💱",
    children: [
      { id: "dex-swap", label: "Swap Tokens", path: "/dex/swap", icon: "🔄" },
      { id: "dex-wrap", label: "Wrap / Unwrap", path: "/dex/wrap", icon: "📦" },
      {
        id: "dex-bridge",
        label: "ETH Bridge",
        path: "/dex/bridge",
        icon: "🌉",
      },
      { id: "dex-pool", label: "Pool", path: "/dex/pool", icon: "💧" },
      {
        id: "dex-explore-tokens",
        label: "Explore Tokens",
        path: "/dex/explore/tokens",
        icon: "🪙",
      },
      {
        id: "dex-explore-pools",
        label: "Explore Pools",
        path: "/dex/explore/pools",
        icon: "🏊",
      },
      {
        id: "dex-explore-transactions",
        label: "Transactions",
        path: "/dex/explore/transactions",
        icon: "📋",
      },
    ],
  },
  // {
  //     id: 'trending',
  //     label: 'Trends',
  //     path: '/trending',
  //     icon: '📈',
  // },
  // {
  //     id: 'invite',
  //     label: 'Invite & Earn',
  //     path: '/trendminer/invite',
  //     icon: '🎁',
  // },
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
