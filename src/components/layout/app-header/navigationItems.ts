import { TRENDING_ENABLED } from '@/config';
import {
  Home, Search, ArrowLeftRight, Gift, LucideIcon, User, Vote,
} from 'lucide-react';

export interface NavigationItem {
  id: string;
  label: string;
  path?: string;
  icon: LucideIcon;
  isExternal?: boolean;
}

const HOME_ITEM: NavigationItem = {
  id: 'home',
  label: 'Home',
  path: '/',
  icon: Home,
};

const EXPLORE_ITEM: NavigationItem = {
  id: 'explore',
  label: 'Explore',
  path: '/trends/tokens',
  icon: Search,
};

const DEFI_ITEM: NavigationItem = {
  id: 'dex',
  label: 'DeFi',
  path: '/defi',
  icon: ArrowLeftRight,
};

const DAO_ITEM: NavigationItem = {
  id: 'dao',
  label: 'DAO',
  path: '/trends/daos',
  icon: Vote,
};

const REFER_EARN_ITEM: NavigationItem = {
  id: 'refer-earn',
  label: 'Refer & Earn',
  path: '/trends/invite',
  icon: Gift,
};

export const getNavigationItems = (): NavigationItem[] => [
  HOME_ITEM,
  TRENDING_ENABLED && EXPLORE_ITEM,
  DEFI_ITEM,
  TRENDING_ENABLED && DAO_ITEM,
  TRENDING_ENABLED && REFER_EARN_ITEM,
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

/**
 * Items rendered directly in the mobile footer bar. DeFi and DAO are moved
 * into the "More" dropdown to keep the bar compact on small screens.
 */
export const getMobileFooterNavigationItems = (
  activeAccount?: string | null,
): NavigationItem[] => [
  HOME_ITEM,
  ...(TRENDING_ENABLED ? [EXPLORE_ITEM] : []),
  ...(TRENDING_ENABLED ? [REFER_EARN_ITEM] : []),
  {
    id: 'account',
    label: 'Account',
    path: activeAccount ? `/users/${activeAccount}` : undefined,
    icon: User,
  },
];

/**
 * Items shown inside the mobile "More" dropdown.
 */
export const getMobileMoreNavigationItems = (): NavigationItem[] => [
  DEFI_ITEM,
  ...(TRENDING_ENABLED ? [DAO_ITEM] : []),
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
