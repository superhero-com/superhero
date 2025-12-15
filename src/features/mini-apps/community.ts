/**
 * Community Mini-Apps Registry
 * 
 * This file is where community developers can register their own mini-apps.
 * Simply import this file in your plugin code and use registerMiniApp().
 * 
 * Alternatively, you can create your own plugin file and import it in plugins.ts
 * 
 * @example
 * ```tsx
 * import { registerMiniApp } from '@/features/mini-apps';
 * import { lazy } from 'react';
 * 
 * registerMiniApp({
 *   metadata: {
 *     id: 'my-community-app',
 *     name: 'My Community App',
 *     description: 'A cool community-built mini-app',
 *     icon: '🚀',
 *     path: '/apps/my-community-app',
 *     category: 'community',
 *     gradient: 'from-purple-500 to-pink-500',
 *     author: 'Your Name',
 *     authorUrl: 'https://github.com/yourusername',
 *     version: '1.0.0',
 *     tags: ['community', 'utility'],
 *   },
 *   route: {
 *     path: '/apps/my-community-app',
 *     component: lazy(() => import('./MyCommunityApp')),
 *   },
 * });
 * ```
 */

// Import community plugins here
// Example:
// import './community-plugins/my-app';

// Or register directly:
// import { registerMiniApp } from './registry';
// import { lazy } from 'react';
// 
// registerMiniApp({
//   metadata: { ... },
//   route: { ... },
// });


