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


