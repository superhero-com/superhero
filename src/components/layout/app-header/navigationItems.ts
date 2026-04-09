import { TRENDING_ENABLED } from '@/config';
import {
  Home, Search, ArrowLeftRight, Gift, LucideIcon, User,
} from 'lucide-react';

export interface NavigationItem {
  id: string;
  label: string;
  path?: string;
  icon: LucideIcon;
  isExternal?: boolean;
}

export const getNavigationItems = (): NavigationItem[] => [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    icon: Home,
  },
  TRENDING_ENABLED && {
    id: 'explore',
    label: 'Explore',
    path: '/trends/tokens',
    icon: Search,
  },
  {
    id: 'dex',
    label: 'DeFi',
    path: '/defi',
    icon: ArrowLeftRight,
  },
  TRENDING_ENABLED && {
    id: 'refer-earn',
    label: 'Refer & Earn',
    path: '/trends/invite',
    icon: Gift,
  },

  // {
  //     id: 'landing',
  //     label: 'Info',
  //     path: '/landing',
  //     icon: Info,
  // },
  // {
  //     id: 'github',
  //     label: 'GitHub',
  //     path: 'https://github.com/aeternity/superhero-ui',
  //     icon: Github,
  //     isExternal: true,
  // },
].filter(Boolean) as NavigationItem[];

export const getAppNavigationItems = (activeAccount?: string | null): NavigationItem[] => [
  ...getNavigationItems(),
  {
    id: 'account',
    label: 'Account',
    path: activeAccount ? `/users/${activeAccount}` : undefined,
    icon: User,
  },
];

export const getActiveNavigationPath = (
  pathname: string,
  navigationItems: NavigationItem[],
): string | undefined => navigationItems
  .filter((item): item is NavigationItem & { path: string } => !!item?.path && !item?.isExternal)
  .filter((item) => (item.path === '/'
    ? pathname === '/'
    : pathname === item.path || pathname.startsWith(`${item.path}/`)))
  .sort((a, b) => b.path.length - a.path.length)[0]?.path;
