import type React from 'react';
import type { ComposerAction, ItemAction, ComposerActionCtx } from '@/plugin-sdk';

export const composerRegistry: Array<{ getActions: (ctx: ComposerActionCtx) => ComposerAction[] }> = [];

export const itemActionRegistry: Array<(ctx: ComposerActionCtx) => ItemAction[]> = [];

export const routeRegistry: Array<{ path: string; element: React.ReactNode }> = [];

export const modalRegistry: Record<string, React.FC<any>> = {};


