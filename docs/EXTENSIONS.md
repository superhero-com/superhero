# Superhero App Extensions

Extensions are first-class modules that can add routes, menu items, feed entries, composer actions, item actions, and modals. They are authored with the existing plugin SDK and loaded at runtime.

## Capabilities
- routes: add pages (mounted dynamically via routeRegistry)
- menu: add header navigation items (merged via navRegistry)
- feed: contribute feed entries and renderers
- composer: add composer actions
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
    capabilities: ['routes'],
  },
  setup({ register }) {
    register({
      routes: [{ path: '/my-ext', element: <MyApp /> }],
      menu: [{ id: 'my-ext', label: 'My Ext', path: '/my-ext', icon: '🧩' }],
    });
  },
});
```

## Navigation
Extensions contribute nav via `menu`. The host merges `navRegistry` with core items.

## Routing
Extensions contribute to `routeRegistry`. Routes render at runtime without rebuild.

## Contracts
Use `createContractLoader(sdk)` from `src/extensions/contract.ts` to load ACI-based contract instances.

## Backend integration
Point your extension to backend services. For Social Superhero backend, see `superhero-api`:
- repo: https://github.com/superhero-com/superhero-api
- flow: index chain data → expose REST/WebSocket → consume from extension client
