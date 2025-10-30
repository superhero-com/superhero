import type React from "react";

export type PluginMeta = {
  id: string;
  name: string;
  version: string;
  apiVersion: "1.x";
  capabilities: Array<"feed" | "composer" | "item-actions" | "routes" | "modals">;
  description?: string;
  author?: string;
  homepage?: string;
};

export type ComposerActionCtx = {
  insertText: (text: string) => void;
  navigate: (to: string) => void;
  storage: { get: (k: string) => any; set: (k: string, v: any) => void };
  theme: { colorScheme: "light" | "dark" };
  events: { emit: (e: string, p?: any) => void; on: (e: string, h: (p: any) => void) => () => void };
  // New helpers for attachments and feed pushes
  cacheLink?: (postId: string, kind: string, payload: any) => void;
  pushFeedEntry?: (kind: string, entry: any) => void;
};

export type ComposerAction = {
  id: string;
  label: string;
  Icon?: React.ComponentType<{ className?: string }>;
  onClick: (ctx: ComposerActionCtx) => void | Promise<void>;
};

export type FeedEntry<T = unknown> = {
  id: string;
  createdAt: string;
  kind: string;
  data: T;
};

export type FeedPlugin<T = any> = {
  kind: string;
  fetchPage?: (page: number) => Promise<{ entries: FeedEntry<T>[]; nextPage?: number }>;
  Render: (props: { entry: FeedEntry<T>; onOpen?: (id: string) => void }) => JSX.Element;
  Skeleton?: React.FC;
};

export type ItemAction<T = any> = {
  id: string;
  label: string;
  when?: (entry: FeedEntry<T>) => boolean;
  onClick: (entry: FeedEntry<T>, ctx: ComposerActionCtx) => void | Promise<void>;
};

export type PluginExports = {
  feed?: FeedPlugin<any>;
  composer?: { getActions: (ctx: ComposerActionCtx) => ComposerAction[] };
  itemActions?: (ctx: ComposerActionCtx) => ItemAction[];
  routes?: Array<{ path: string; element: React.ReactNode }>;
  modals?: Record<string, React.FC<any>>;
  // App navigation entries contributed by the plugin
  menu?: NavItem[];
  // Optional: composer attachments surface
  attachments?: () => ComposerAttachmentSpec[];
};

export type PluginHostContext = {
  ctx: ComposerActionCtx;
  register: (exports: PluginExports) => void;
};

export type SuperheroPlugin = {
  meta: PluginMeta;
  setup: (host: PluginHostContext) => void;
};

export function definePlugin(p: SuperheroPlugin) {
  return p;
}

// Attachments API
export type AttachmentPanelProps = { ctx: ComposerAttachmentCtx; onRemove: () => void };

export type ComposerAttachmentCtx = ComposerActionCtx & {
  // per-attachment namespaced state helpers
  getValue: <T = any>(ns: string) => T | undefined;
  setValue: <T = any>(ns: string, value: T) => void;
  ensureWallet: () => Promise<{ sdk: any; currentBlockHeight?: number }>
};

export type AttachmentValidationError = { field?: string; message: string };

export type ComposerAttachmentSpec = {
  id: string;
  label: string;
  Icon?: React.ComponentType<{ className?: string }>;
  requiresWallet?: boolean;
  maxPerPost?: number;
  Panel: React.FC<AttachmentPanelProps>;
  validate: (ctx: ComposerAttachmentCtx) => AttachmentValidationError[];
  // Called after the post is mined; may enqueue work, push feed, update cache
  onAfterPost: (ctx: ComposerAttachmentCtx, post: { id: string; text: string }) => Promise<void>;
};

// Navigation contributions from plugins
export type NavItem = { id: string; label: string; path: string; icon?: string; section?: string };


