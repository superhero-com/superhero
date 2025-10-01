import configs from "@/configs";

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  isExternal?: boolean;
  children?: NavigationItem[];
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
    label: "DEX",
    path: "/dex/swap",
    icon: "💱",
    children: [
      { id: "dex-swap", label: "Swap Tokens", path: "/dex/swap", icon: "🔄" },
      
      {
        id: "ae-eth-swap",
        label: "ETH -> AE Swap",
        path: "/eth-ae-swap",
        icon: "💱",
      },
      { id: "dex-wrap", label: "(Un)Wrap AE/WAE", path: "/dex/wrap", icon: "📦" },
      { id: "dex-pool", label: "Liquidity", path: "/dex/pool", icon: "💧" },
      {
        id: "dex-explore",
        label: "Explore",
        path: "/dex/explore",
        icon: "🔍",
        children: [
          {
            id: "dex-explore-tokens",
            label: "AEX-9 Tokens",
            path: "/dex/explore/tokens",
            icon: "🪙",
          },
          {
            id: "dex-explore-pools",
            label: "Liquidity Pools",
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
    ],
  },
  {
    id: "ae-eth-swap",
    label: "Bridge (ETH <> AE)",
    path: "/eth-ae-swap",
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
