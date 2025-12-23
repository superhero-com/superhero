/**
 * Mini-App Plugins Loader
 * 
 * This file initializes the mini-app plugin system and loads all plugins.
 * Community developers can create their own plugin files and import them here,
 * or use the registerMiniApp function directly in their code.
 */

import { registerBuiltInMiniApps } from './built-in';
import { miniAppRegistry } from './registry';

// Import community plugins (if any)
// Community developers can create their own plugin files and import them here
// Example:
// import './community/my-custom-app';

/**
 * Initialize all mini-app plugins
 * 
 * This function should be called during app initialization to register
 * all built-in mini-apps and any community plugins.
 */
export function initializeMiniApps(): void {
  // Register built-in mini-apps first
  registerBuiltInMiniApps();

  // Initialize the registry (calls initialize() on all plugins)
  miniAppRegistry.initialize();

  // Log registered apps for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Mini-Apps] Registered ${miniAppRegistry.getAll().length} mini-apps:`, 
      miniAppRegistry.getAllMetadata().map(app => app.id).join(', '));
  }
}

/**
 * Get all mini-app routes for the router
 */
export function getMiniAppRoutes() {
  return miniAppRegistry.getAllRoutes();
}



