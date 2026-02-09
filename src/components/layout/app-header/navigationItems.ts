import configs from '@/configs';
import { TFunction } from 'i18next';

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  isExternal?: boolean;
}

export const getNavigationItems = (t: TFunction): NavigationItem[] => [
  {
    id: 'home',
    label: 'Home',
    path: '/',
    icon: '🏠',
  },
  configs.features.trending && {
    id: 'explore',
    label: 'Explore',
    path: '/trends/tokens',
    icon: '🔍',
  },
  {
    id: 'dex',
    label: 'DeFi',
    path: '/defi',
    icon: '💱',
  },
  configs.features.trending && {
    id: 'refer-earn',
    label: 'Refer & Earn',
    path: '/trends/invite',
    icon: '🎁',
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
