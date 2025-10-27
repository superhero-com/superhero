import { type SuperheroPlugin, type PluginExports } from '@/plugin-sdk';
import { registerPlugin as registerFeed } from '@/features/social/feed-plugins/registry';
import { composerRegistry, itemActionRegistry, routeRegistry, modalRegistry, attachmentRegistry, navRegistry } from './registries';

export async function loadExternalPlugins(urls: string[], hostCtx: any, allow: string[] = []) {
  for (const url of urls || []) {
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - vite ignore external dynamic import
      const mod = await import(/* @vite-ignore */ url);
      const plugin: SuperheroPlugin = mod?.default || mod;
      if (!plugin?.meta?.apiVersion?.startsWith('1.')) continue;
      const caps = plugin.meta.capabilities || [];
      const allowed = allow && allow.length ? caps.filter((c) => allow.includes(c)) : caps;
      const register = (exports: PluginExports) => {
        if (exports.feed && allowed.includes('feed')) registerFeed(exports.feed);
        if (exports.composer && allowed.includes('composer')) composerRegistry.push(exports.composer);
        if (exports.itemActions && allowed.includes('item-actions')) itemActionRegistry.push(exports.itemActions);
        if (exports.routes && allowed.includes('routes')) {
          const existing = new Set(routeRegistry.map((r) => r.path));
          const unique = exports.routes.filter((r) => !existing.has(r.path));
          routeRegistry.push(...unique);
        }
        if (exports.modals && allowed.includes('modals')) Object.assign(modalRegistry, exports.modals);
        if (exports.menu && allowed.includes('routes')) {
          const existing = new Set(navRegistry.map((m) => m.id));
          const unique = exports.menu.filter((m) => !existing.has(m.id));
          navRegistry.push(...unique);
        }
        if ((exports as any).attachments && allowed.includes('composer')) attachmentRegistry.push(...((exports as any).attachments() || []));
      };
      plugin.setup({ ctx: hostCtx, register });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Plugin load failed:', url, e);
    }
  }
}


