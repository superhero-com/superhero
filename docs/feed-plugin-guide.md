## Feed plugin guide

This guide explains how to add a new feed item type to the social feed with strong style isolation and minimal wiring.

### Key concepts
- Use `FeedEntry` to normalize data (`id`, `createdAt`, `kind`, `data`).
- Register a `FeedPlugin` in `registry.ts` that provides a `Render` for your kind.
- Plugins live under `src/features/social/feed-plugins/<kind>/`.
- Style isolation: use CSS Modules in your plugin and the shared `FeedPluginCard` wrapper (adds `isolation: isolate`).

### File layout example
```
src/features/social/feed-plugins/my-item/
  MyItemCard.module.scss
  MyItemCard.tsx
  plugin.tsx
  index.ts
```

### Minimal plugin
```ts
// src/features/social/feed-plugins/my-item/plugin.tsx
import React from 'react';
import { registerPlugin } from '../registry';
import type { FeedEntry } from '../types';

type MyItemData = { title: string };

export function registerMyItemPlugin() {
  registerPlugin({
    kind: 'my-item',
    Render: ({ entry }: { entry: FeedEntry<MyItemData> }) => (
      <div>{entry.data.title}</div>
    ),
  });
}
```

Register once in a host module (e.g., `FeedList.tsx`):
```ts
import { registerMyItemPlugin } from '@/features/social/feed-plugins/my-item';
registerMyItemPlugin();
```

### Normalizing data
Create a small adapter that converts your backend/API object to a `FeedEntry`:
```ts
export function adaptMyItemToEntry(obj: Any): FeedEntry<MyItemData> {
  return {
    id: `my-item:${obj.id}`,
    kind: 'my-item',
    createdAt: obj.createdAt,
    data: { title: obj.title },
  };
}
```

### Styling that won’t be overridden
- Use a CSS Module (e.g., `MyItemCard.module.scss`).
- Wrap your UI in `FeedPluginCard` for consistent glass card styling and `isolation: isolate`.
- Avoid global class names; prefer local module classes.

### Poll and token examples
- See `src/features/social/feed-plugins/poll-created/` and `token-created/` for reference implementations.

### Infinite scroll & merging
- The host feed merges all items by `createdAt` and renders each `FeedEntry` via `FeedRenderer`.
- If your plugin needs pagination, implement `fetchPage(page)` on the plugin and wire it in the host.

### Detail pages
- Poll detail route: `/poll/:pollAddress` renders a highlighted poll in the social shell (with RightRail).
- From a plugin render, call `onOpen?.(id)`; the host will navigate appropriately.
- The feed host adapts click handlers per kind; for polls it uses `/poll/:pollAddress`.


