import { configs } from '@/configs';
import {
  Home, Search, ArrowLeftRight, Gift, LucideIcon,
} from 'lucide-react';

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
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
  configs.features.trending && {
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
  configs.features.trending && {
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
