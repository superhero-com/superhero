import React from 'react';
import SocialLayout from '@/components/layout/SocialLayout';
import { MiniAppContainer } from './components/MiniAppContainer';
import type { MiniAppPlugin, MiniAppMetadata, MiniAppCategory } from './types';

/**
 * Mini-App Registry
 * 
 * This registry stores all registered mini-apps. Community developers can
 * register their own mini-apps by importing and using the registerMiniApp function.
 */
class MiniAppRegistry {
  private plugins: Map<string, MiniAppPlugin> = new Map();
  private initialized = false;

  /**
   * Register a new mini-app plugin
   */
  register(plugin: MiniAppPlugin): void {
    if (this.plugins.has(plugin.metadata.id)) {
      console.warn(`Mini-app with id "${plugin.metadata.id}" is already registered. Overwriting...`);
    }

    // Validate plugin
    this.validatePlugin(plugin);

    this.plugins.set(plugin.metadata.id, plugin);

    // Initialize if provided
    if (plugin.initialize && this.initialized) {
      try {
        plugin.initialize();
      } catch (error) {
        console.error(`Failed to initialize mini-app "${plugin.metadata.id}":`, error);
      }
    }
  }

  /**
   * Unregister a mini-app
   */
  unregister(id: string): void {
    const plugin = this.plugins.get(id);
    if (plugin?.cleanup) {
      try {
        plugin.cleanup();
      } catch (error) {
        console.error(`Failed to cleanup mini-app "${id}":`, error);
      }
    }
    this.plugins.delete(id);
  }

  /**
   * Get a plugin by ID
   */
  get(id: string): MiniAppPlugin | undefined {
    return this.plugins.get(id);
  }

  /**
   * Get all registered plugins
   */
  getAll(): MiniAppPlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugins by category
   */
  getByCategory(category: MiniAppCategory): MiniAppPlugin[] {
    return this.getAll().filter(plugin => plugin.metadata.category === category);
  }

  /**
   * Get all metadata (for landing page, etc.)
   */
  getAllMetadata(): MiniAppMetadata[] {
    return this.getAll().map(plugin => plugin.metadata);
  }

  /**
   * Get all routes (for router configuration)
   */
  getAllRoutes() {
    return this.getAll().map(plugin => {
      const Component = plugin.route.component;
      const Layout = plugin.route.layout || SocialLayout;
      
      return {
        path: plugin.route.path,
        element: React.createElement(
          Layout,
          {},
          React.createElement(
            React.Suspense,
            { fallback: React.createElement('div', { className: 'loading-fallback' }) },
            React.createElement(
              MiniAppContainer,
              {},
              React.createElement(Component)
            )
          )
        ),
        ...plugin.route.options,
      };
    });
  }

  /**
   * Initialize all plugins
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    this.getAll().forEach(plugin => {
      if (plugin.initialize) {
        try {
          plugin.initialize();
        } catch (error) {
          console.error(`Failed to initialize mini-app "${plugin.metadata.id}":`, error);
        }
      }
    });

    this.initialized = true;
  }

  /**
   * Validate plugin structure
   */
  private validatePlugin(plugin: MiniAppPlugin): void {
    if (!plugin.metadata.id) {
      throw new Error('Mini-app metadata must have an id');
    }
    if (!plugin.metadata.name) {
      throw new Error('Mini-app metadata must have a name');
    }
    if (!plugin.metadata.path) {
      throw new Error('Mini-app metadata must have a path');
    }
    if (!plugin.route.component) {
      throw new Error('Mini-app must have a route component');
    }
  }
}

// Singleton instance
export const miniAppRegistry = new MiniAppRegistry();

/**
 * Register a mini-app plugin
 * 
 * This is the main API for registering mini-apps. Community developers
 * can use this function to register their own mini-apps.
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
 *     author: 'John Doe',
 *     authorUrl: 'https://github.com/johndoe',
 *   },
 *   route: {
 *     path: '/apps/my-app',
 *     component: lazy(() => import('./MyApp')),
 *   },
 * });
 * ```
 */
export function registerMiniApp(plugin: MiniAppPlugin): void {
  miniAppRegistry.register(plugin);
}

/**
 * Unregister a mini-app
 */
export function unregisterMiniApp(id: string): void {
  miniAppRegistry.unregister(id);
}

