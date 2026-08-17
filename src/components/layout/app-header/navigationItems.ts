import { TRENDING_ENABLED } from '@/config';
import {
  Home, Search, ArrowLeftRight, Gift, LucideIcon, User, Vote, Landmark, MessageCircle,
} from 'lucide-react';

export interface NavigationItem {
  id: string;
  labelKey: string;
  path?: string;
  icon: LucideIcon;
  isExternal?: boolean;
}

const HOME_ITEM: NavigationItem = {
  id: 'home',
  labelKey: 'nav.home',
  path: '/',
  icon: Home,
};

const EXPLORE_ITEM: NavigationItem = {
  id: 'explore',
  labelKey: 'nav.explore',
  path: '/trends/tokens',
  icon: Search,
};

const DEFI_ITEM: NavigationItem = {
  id: 'dex',
  labelKey: 'nav.defi',
  path: '/defi',
  icon: ArrowLeftRight,
};

const DAO_ITEM: NavigationItem = {
  id: 'dao',
  labelKey: 'nav.dao',
  path: '/trends/daos',
  icon: Vote,
};

const REFER_EARN_ITEM: NavigationItem = {
  id: 'refer-earn',
  labelKey: 'nav.earnRewards',
  path: '/trends/invite',
  icon: Gift,
};

const CHAT_ITEM: NavigationItem = {
  id: 'chat',
  labelKey: 'nav.chat',
  path: '/chat',
  icon: MessageCircle,
};

const GET_AE_ITEM: NavigationItem = {
  id: 'get-ae',
  labelKey: 'nav.getAe',
  path: '/get-ae',
  icon: Landmark,
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
    labelKey: 'nav.superheroId',
    path: activeAccount ? `/users/${activeAccount}` : undefined,
    icon: User,
  },
];

/**
 * Items rendered directly in the mobile footer bar. DeFi and DAO are moved
 * into the "More" dropdown to keep the bar compact on small screens.
 *
 * In PWA standalone mode, the Chat item is always shown.
 * In browser mode, Chat may be omitted to prioritize other actions.
 */
export const getMobileFooterNavigationItems = (
  activeAccount?: string | null,
  pwaMode?: boolean,
): NavigationItem[] => [
  HOME_ITEM,
  ...(TRENDING_ENABLED ? [EXPLORE_ITEM] : []),
  ...(pwaMode ? [CHAT_ITEM] : []),
  {
    id: 'account',
    labelKey: 'nav.superheroId',
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
  GET_AE_ITEM,
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
