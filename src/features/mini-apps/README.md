# Mini-Apps Plugin System

A plugin-based architecture for extending the Superhero platform with community-built mini-apps.

## Architecture

```
src/features/mini-apps/
├── types.ts              # TypeScript types and interfaces
├── registry.ts           # Core registry system
├── built-in.ts           # Built-in mini-app registrations
├── plugins.ts            # Plugin initialization
├── community.ts          # Community plugin registry
├── views/
│   └── MiniAppsLanding.tsx  # Landing page component
└── README.md             # This file
```

## How It Works

1. **Registry**: The `MiniAppRegistry` class manages all registered mini-apps
2. **Registration**: Apps register themselves using `registerMiniApp()`
3. **Initialization**: All plugins are initialized when the app starts
4. **Routes**: Routes are dynamically generated from registered plugins
5. **UI**: The landing page automatically displays all registered apps

## Usage

### For Core Developers

Built-in apps are registered in `built-in.ts`. To add a new built-in app:

```tsx
import { registerMiniApp } from './registry';
import { lazy } from 'react';

registerMiniApp({
  metadata: { /* ... */ },
  route: { /* ... */ },
});
```

### For Community Developers

See `/docs/MINI_APPS.md` for complete documentation on creating and registering community mini-apps.

## Key Features

- ✅ **Plugin-based**: Easy to extend without modifying core code
- ✅ **Type-safe**: Full TypeScript support
- ✅ **Lazy loading**: Automatic code splitting
- ✅ **Dynamic routes**: Routes generated from registry
- ✅ **Category grouping**: Apps organized by category
- ✅ **Metadata rich**: Support for tags, authors, versions, etc.
- ✅ **Initialization hooks**: Apps can initialize/cleanup resources

## API Reference

### `registerMiniApp(plugin: MiniAppPlugin)`

Register a new mini-app plugin.

### `unregisterMiniApp(id: string)`

Unregister a mini-app by ID.

### `miniAppRegistry.getAll()`

Get all registered plugins.

### `miniAppRegistry.getByCategory(category)`

Get plugins filtered by category.

### `getMiniAppRoutes()`

Get all routes for the router (used in `routes.tsx`).

## Categories

- `trading`: Trading and DEX-related apps
- `bridge`: Cross-chain bridging apps
- `explore`: Exploration and discovery tools
- `community`: Community-built apps
- `utility`: Utility tools and helpers

## Examples

See `/docs/MINI_APPS.md` for complete examples.


