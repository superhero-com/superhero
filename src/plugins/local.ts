import type { PluginExports } from "@/plugin-sdk";
import { registerPlugin as registerFeed } from "@/features/social/feed-plugins/registry";
import { composerRegistry, itemActionRegistry, routeRegistry, modalRegistry, attachmentRegistry, navRegistry } from "@/features/social/plugins/registries";

// Local, first-party plugins can be imported statically here
// Example: import nftMarketplace from '@/plugins/nft-marketplace';
import tokenCreated from '@/plugins/social/token-created';
import pollCreated from '@/plugins/social/poll-created';
import nftMarketplace from '@/plugins/nft-marketplace';

const localPlugins: Array<any> = [
  // Ensure only one instance per plugin id gets registered
  nftMarketplace,
  tokenCreated,
  pollCreated,
];

export function loadLocalPlugins(hostCtx: any, allow: string[] = []) {
  const allowedCaps = (caps: string[]) => (allow && allow.length ? caps.filter((c) => allow.includes(c)) : caps);
  for (const plugin of localPlugins) {
    if (!plugin?.meta?.apiVersion?.startsWith('1.')) continue;
    const register = (exports: PluginExports) => {
      const caps = allowedCaps(plugin.meta.capabilities || []);
      if (exports.feed && caps.includes('feed')) registerFeed(exports.feed);
      if (exports.composer && caps.includes('composer')) composerRegistry.push(exports.composer);
      if (exports.itemActions && caps.includes('item-actions')) itemActionRegistry.push(exports.itemActions);
      if (exports.routes && caps.includes('routes')) routeRegistry.push(...exports.routes);
      if (exports.modals && caps.includes('modals')) Object.assign(modalRegistry, exports.modals);
      if (exports.menu && caps.includes('routes')) navRegistry.push(...exports.menu);
      if ((exports as any).attachments && caps.includes('composer')) attachmentRegistry.push(...((exports as any).attachments() || []));
    };
    try {
      plugin.setup({ ctx: hostCtx, register });
    } catch {
      // ignore local plugin errors
    }
  }
}


