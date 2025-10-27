import type React from 'react';
import type { ComposerAction, ItemAction, ComposerActionCtx, ComposerAttachmentSpec, NavItem } from '@/plugin-sdk';

export const composerRegistry: Array<{ getActions: (ctx: ComposerActionCtx) => ComposerAction[] }> = [];

export const itemActionRegistry: Array<(ctx: ComposerActionCtx) => ItemAction[]> = [];

export const routeRegistry: Array<{ path: string; element: React.ReactNode }> = [];

export const modalRegistry: Record<string, React.FC<any>> = {};

export const attachmentRegistry: ComposerAttachmentSpec[] = [];

// New: plugin-provided navigation entries
export const navRegistry: NavItem[] = [];

// Helper to clear all registries (useful on hot-reload or guarded bootstraps)
export function resetAllRegistries() {
  composerRegistry.splice(0, composerRegistry.length);
  itemActionRegistry.splice(0, itemActionRegistry.length);
  routeRegistry.splice(0, routeRegistry.length);
  for (const k of Object.keys(modalRegistry)) delete (modalRegistry as any)[k];
  attachmentRegistry.splice(0, attachmentRegistry.length);
  navRegistry.splice(0, navRegistry.length);
}


