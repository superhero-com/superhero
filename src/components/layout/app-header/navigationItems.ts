export interface NavigationItem {
    id: string;
    label: string;
    path: string;
    icon: string;
    isExternal?: boolean;
}

export const navigationItems: NavigationItem[] = [
    {
        id: 'home',
        label: 'Home',
        path: '/',
        icon: '🏠',
    },
    {
        id: 'dex',
        label: 'DEX',
        path: '/dex/swap',
        icon: '💱',
    },
    {
        id: 'trending',
        label: 'Trends',
        path: '/trending',
        icon: '📈',
    },
    {
        id: 'invite',
        label: 'Invite & Earn',
        path: '/trendminer/invite',
        icon: '🎁',
    },
    {
        id: 'governance',
        label: 'Governance & Voting',
        path: '/voting',
        icon: '🗳️',
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
];