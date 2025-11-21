import type React from 'react';
import type { ComposerAction, ComposerActionCtx } from '@/plugin-sdk';

// Base shape for any entry in the unified feed
export type FeedEntryBase = {
  id: string; // globally unique identifier for the entry
  createdAt: string; // ISO timestamp used for sorting/merging across kinds
  kind: string; // e.g., "post", "token-created", "poll-created"
};

// Normalized feed entry that carries kind-specific data
export type FeedEntry<T = unknown> = FeedEntryBase & { data: T };

// Result of a paginated plugin fetch
export type FeedPage<T = any> = {
  entries: FeedEntry<T>[];
  nextPage?: number; // undefined when no more pages
};

// Plugin contract. Each plugin is responsible for producing normalized entries
// and rendering a single entry of its own kind.
export type FeedPlugin<T = any> = {
  kind: string;
  fetchPage?: (page: number) => Promise<FeedPage<T>>;
  // Optional live-update hook (e.g., websockets). It can expose a push helper
  // to allow the host feed to inject new entries.
  useLive?: () => { push: (entry: FeedEntry<T>) => void } | void;
  // Renderer for a single entry of this kind
  Render: (props: { entry: FeedEntry<T>; onOpen?: (id: string) => void }) => JSX.Element;
  // Optional placeholder while loading
  Skeleton?: React.FC;
  // Optional: contribute composer actions (used by host if present)
  getComposerActions?: (ctx: ComposerActionCtx) => ComposerAction[];
};

// Helper type guards
export function isFeedEntry(value: any): value is FeedEntry<any> {
  return (
    value &&
    typeof value === 'object' &&
    typeof value.id === 'string' &&
    typeof value.createdAt === 'string' &&
    typeof value.kind === 'string'
  );
}

export type AnyFeedPlugin = FeedPlugin<any>;


