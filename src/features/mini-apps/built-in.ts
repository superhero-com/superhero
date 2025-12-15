import { lazy } from 'react';
import { registerMiniApp } from './registry';
import type { MiniAppPlugin } from './types';

// Import built-in mini-app components
const DexSwap = lazy(() => import('../dex/views/DexSwap'));
const DexWrap = lazy(() => import('../dex/views/DexWrap'));
const DexBridge = lazy(() => import('../dex/views/DexBridge'));
const Bridge = lazy(() => import('../ae-eth-bridge/views/Bridge'));
const Pool = lazy(() => import('../dex/views/Pool'));
const AddTokens = lazy(() => import('../../views/AddTokens'));
const DexExploreTokens = lazy(() => import('../dex/views/DexExploreTokens'));

/**
 * Register all built-in mini-apps
 */
export function registerBuiltInMiniApps(): void {
  // Swap
  registerMiniApp({
    metadata: {
      id: 'swap',
      name: 'Swap',
      description: 'Trade any supported AEX-9 tokens instantly',
      icon: '🔄',
      path: '/apps/swap',
      category: 'trading',
      gradient: 'from-blue-500 to-cyan-500',
      builtIn: true,
      tags: ['trading', 'swap', 'dex'],
    },
    route: {
      path: '/apps/swap',
      component: DexSwap,
    },
  });

  // Pool
  registerMiniApp({
    metadata: {
      id: 'pool',
      name: 'Pool',
      description: 'Manage liquidity positions and earn fees',
      icon: '💧',
      path: '/apps/pool',
      category: 'trading',
      gradient: 'from-emerald-500 to-teal-500',
      builtIn: true,
      tags: ['trading', 'liquidity', 'pool', 'lp'],
    },
    route: {
      path: '/apps/pool',
      component: Pool,
    },
  });

  // Wrap
  registerMiniApp({
    metadata: {
      id: 'wrap',
      name: 'Wrap',
      description: 'Convert AE ↔ WAE seamlessly',
      icon: '📦',
      path: '/apps/wrap',
      category: 'trading',
      gradient: 'from-purple-500 to-pink-500',
      builtIn: true,
      tags: ['trading', 'wrap', 'wae'],
    },
    route: {
      path: '/apps/wrap',
      component: DexWrap,
    },
  });

  // Bridge (AE-ETH)
  registerMiniApp({
    metadata: {
      id: 'bridge',
      name: 'Bridge',
      description: 'Bridge tokens between Ethereum and æternity',
      icon: '🌉',
      path: '/apps/bridge',
      category: 'bridge',
      gradient: 'from-indigo-500 to-blue-500',
      builtIn: true,
      tags: ['bridge', 'ethereum', 'cross-chain'],
    },
    route: {
      path: '/apps/bridge',
      component: Bridge,
    },
  });

  // Buy AE
  registerMiniApp({
    metadata: {
      id: 'buy-ae',
      name: 'Buy AE',
      description: 'Buy AE tokens with ETH',
      icon: '💎',
      path: '/apps/buy-ae-with-eth',
      category: 'bridge',
      gradient: 'from-rose-500 to-orange-500',
      builtIn: true,
      tags: ['bridge', 'buy', 'ethereum'],
    },
    route: {
      path: '/apps/buy-ae-with-eth',
      component: DexBridge,
    },
  });

  // Explorer
  registerMiniApp({
    metadata: {
      id: 'explorer',
      name: 'Explorer',
      description: 'Browse tokens, pools, and transactions',
      icon: '🔍',
      path: '/apps/explore/tokens',
      category: 'explore',
      gradient: 'from-indigo-500 to-blue-500',
      builtIn: true,
      tags: ['explore', 'tokens', 'pools', 'transactions'],
    },
    route: {
      path: '/apps/explore/tokens',
      component: DexExploreTokens,
    },
  });

  // Add Tokens
  registerMiniApp({
    metadata: {
      id: 'add-tokens',
      name: 'Add Tokens',
      description: 'Discover tokens from your wallet and add them to the DEX',
      icon: '➕',
      path: '/apps/pool/add-tokens',
      category: 'trading',
      gradient: 'from-violet-500 to-purple-500',
      builtIn: true,
      tags: ['trading', 'tokens', 'wallet'],
    },
    route: {
      path: '/apps/pool/add-tokens',
      component: AddTokens,
    },
  });
}

