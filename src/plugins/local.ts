import type { PluginExports } from "@/plugin-sdk";
import { registerPlugin as registerFeed } from "@/features/social/feed-plugins/registry";
import { composerRegistry, itemActionRegistry, routeRegistry, modalRegistry, attachmentRegistry, navRegistry, resetAllRegistries } from "@/features/social/plugins/registries";

// Local, first-party plugins can be imported statically here
// Example: import nftMarketplace from '@/plugins/nft-marketplace';
import tokenCreated from '@/plugins/social/token-created';
import pollCreated from '@/plugins/social/poll-created';

const localPlugins: Array<any> = [
  // Tutorial-only example: nft-marketplace is intentionally NOT auto-registered
  // to avoid exposing unfinished features in production.
  tokenCreated,
  pollCreated,
];

export function loadLocalPlugins(hostCtx: any, allow: string[] = []) {
  // In dev/hot-reload scenarios, ensure registries are clean before re-registering
  if (process.env.NODE_ENV !== 'production') {
    resetAllRegistries();
  }
  const allowedCaps = (caps: string[]) => (allow && allow.length ? caps.filter((c) => allow.includes(c)) : caps);
  for (const plugin of localPlugins) {
    if (!plugin?.meta?.apiVersion?.startsWith('1.')) continue;
    const register = (exports: PluginExports) => {
      const caps = allowedCaps(plugin.meta.capabilities || []);
      if (exports.feed && caps.includes('feed')) registerFeed(exports.feed);
      if (exports.composer && caps.includes('composer')) composerRegistry.push(exports.composer);
      if (exports.itemActions && caps.includes('item-actions')) itemActionRegistry.push(exports.itemActions);
      if (exports.routes && caps.includes('routes')) {
        const existing = new Set(routeRegistry.map((r) => r.path));
        const unique = exports.routes.filter((r) => !existing.has(r.path));
        routeRegistry.push(...unique);
      }
      if (exports.modals && caps.includes('modals')) Object.assign(modalRegistry, exports.modals);
      if (exports.menu && caps.includes('routes')) {
        const existing = new Set(navRegistry.map((m) => m.id));
        const unique = exports.menu.filter((m) => !existing.has(m.id));
        navRegistry.push(...unique);
      }
      if ((exports as any).attachments && caps.includes('composer')) attachmentRegistry.push(...((exports as any).attachments() || []));
    };
    try {
      plugin.setup({ ctx: hostCtx, register });
    } catch {
      // ignore local plugin errors
    }
  }
}


