# Superhero App Extensions

> Info: For a step-by-step walkthrough, see [How to build a Superhero App Extension (Polls example)](./tutorials/build-governance-poll-extension.md).

Extensions are first-class modules that can add routes, menu items, feed entries, composer actions, item actions, modals, and composer attachments. They are authored with the existing plugin SDK and loaded at runtime.

## Capabilities
- routes: add pages (mounted dynamically via routeRegistry)
- menu: add header navigation items (merged via navRegistry)
- feed: contribute feed entries and renderers
- composer: add composer actions and attachments
- item-actions: add per-feed-item actions
- modals: register modal components

## Authoring an extension
Minimal example:
```tsx
import React from 'react';
import { definePlugin } from '@/plugin-sdk';
import MyApp from './ui/MyApp';

export default definePlugin({
  meta: {
    id: 'my-ext',
    name: 'My Extension',
    version: '0.1.0',
    apiVersion: '1.x',
    capabilities: ['routes', 'composer'],
  },
  setup({ register }) {
    register({
      routes: [{ path: '/my-ext', element: <MyApp /> }],
      menu: [{ id: 'my-ext', label: 'My Ext', path: '/my-ext', icon: '🧩' }],
      // attachments: () => [myAttachmentSpec],
    });
  },
});
```

## Loading modes
- Local (first‑party): register in `src/plugins/local.ts` for development. Not enabled by default in production.
- External (remote URLs): `CONFIG.PLUGINS` can point to remote modules. The loader enforces the `capabilities` allowlist.

## Capability allowlist
- Use `CONFIG.PLUGIN_CAPABILITIES_ALLOWLIST` to restrict what plugins may register, e.g. `['routes','feed','composer']`.

## Registries lifecycle
- Registries live in `features/social/plugins/registries.ts`.
- In development, local loader resets registries on hot reload to avoid duplicates.
- Plugin bootstrap is guarded to run once per app lifecycle.

## Contracts
Use `createContractLoader(sdk)` from `src/extensions/contract.ts` to load ACI-based contract instances.

## Backend integration
Point your extension to backend services. For Social Superhero governance backend, see:
- repo: https://github.com/superhero-com/superhero-api
- flow: index chain data → expose REST/WebSocket → consume from extension client

## Environment & config
- `public/superconfig.json` (or `window.__SUPERCONFIG__`) provides runtime keys like `NODE_URL`, `MIDDLEWARE_URL`, `GOVERNANCE_API_URL`, `PLUGINS`, `PLUGIN_CAPABILITIES_ALLOWLIST`.

## CI
- `npm run ext:check` validates extension modules. The CI workflow runs it on pull requests.

## Security & UX notes
- Keep capabilities minimal; prefer read-only routes for untrusted plugins.
- Gating composer/actions behind the allowlist reduces risk.
- Validate inputs and handle network failures gracefully.

## Troubleshooting
- Duplicate nav or routes: ensure bootstrap runs once; in dev registries are reset before loading local plugins.
- Wallet not connected: ensure wallet connect flow completes before signing.
- ACI mismatch: recompile and update contract address.

## Full tutorial (Polls example)
See the detailed guide:
`docs/tutorials/build-governance-poll-extension.md`
