/**
 * Mini-Apps Plugin System
 * 
 * This module provides a plugin system for mini-apps, allowing community
 * developers to easily register and extend the platform with their own apps.
 * 
 * @example
 * ```tsx
 * import { registerMiniApp } from '@/features/mini-apps';
 * import MyApp from './MyApp';
 * 
 * registerMiniApp({
 *   metadata: {
 *     id: 'my-app',
 *     name: 'My App',
 *     description: 'A cool mini-app',
 *     icon: '🚀',
 *     path: '/apps/my-app',
 *     category: 'utility',
 *     gradient: 'from-purple-500 to-pink-500',
 *   },
 *   route: {
 *     path: '/apps/my-app',
 *     component: lazy(() => import('./MyApp')),
 *   },
 * });
 * ```
 */

export * from './types';
export * from './registry';
export { registerBuiltInMiniApps } from './built-in';
export { default as MiniAppsLanding } from './views/MiniAppsLanding';


