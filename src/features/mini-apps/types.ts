import { ComponentType, LazyExoticComponent } from 'react';

/**
 * Mini-App Category
 */
export type MiniAppCategory = 'trading' | 'bridge' | 'explore' | 'community' | 'utility';

/**
 * Mini-App Metadata
 */
export interface MiniAppMetadata {
  /** Unique identifier for the mini-app */
  id: string;
  /** Display name */
  name: string;
  /** Short description */
  description: string;
  /** Icon (emoji or icon component) */
  icon: string | ComponentType<{ className?: string }>;
  /** Route path (e.g., '/apps/my-app') */
  path: string;
  /** Category for grouping */
  category: MiniAppCategory;
  /** Gradient colors for icon background */
  gradient: string;
  /** Author/developer name */
  author?: string;
  /** Author website or GitHub */
  authorUrl?: string;
  /** Version */
  version?: string;
  /** Whether this is a built-in app */
  builtIn?: boolean;
  /** Tags for search/filtering */
  tags?: string[];
  /** Whether the app requires authentication */
  requiresAuth?: boolean;
}

/**
 * Mini-App Route Configuration
 */
export interface MiniAppRoute {
  /** Route path pattern */
  path: string;
  /** Lazy-loaded component */
  component: LazyExoticComponent<ComponentType<any>>;
  /** Layout wrapper (defaults to SocialLayout) */
  layout?: ComponentType<{ children: React.ReactNode }>;
  /** Additional route options */
  options?: {
    /** Whether to include in navigation */
    includeInNav?: boolean;
    /** Route metadata */
    meta?: Record<string, any>;
  };
}

/**
 * Complete Mini-App Plugin Definition
 */
export interface MiniAppPlugin {
  /** App metadata */
  metadata: MiniAppMetadata;
  /** Route configuration */
  route: MiniAppRoute;
  /** Optional initialization function */
  initialize?: () => void | Promise<void>;
  /** Optional cleanup function */
  cleanup?: () => void;
}

