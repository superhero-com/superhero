import type { AnyFeedPlugin } from './types';

// Simple in-memory registry. Plugins can be registered from a central file.
const pluginRegistry: AnyFeedPlugin[] = [];

export function registerPlugin(plugin: AnyFeedPlugin) {
  const exists = pluginRegistry.some((p) => p.kind === plugin.kind);
  if (!exists) pluginRegistry.push(plugin);
}

export function getPlugin(kind: string): AnyFeedPlugin | undefined {
  return pluginRegistry.find((p) => p.kind === kind);
}

export function getAllPlugins(): AnyFeedPlugin[] {
  return pluginRegistry.slice();
}

// Host can call this to clear and re-register, mainly useful for tests
export function resetPlugins() {
  pluginRegistry.splice(0, pluginRegistry.length);
}


