# 08a — Plugin SDK deep dive

> [!NOTE]
> The Plugin SDK lets your mini‑æpp integrate into Superhero: add composer attachments, feed entries, item actions, custom routes/modals, and menu entries.

## Capabilities (v1.x)
- `feed`: add new item kinds to the unified feed
- `composer`: add actions and attachments (interactive panels)
- `item-actions`: add contextual actions to feed items
- `routes`: add pages to the app router
- `modals`: register reusable modals
- `menu`: contribute navigation items

## Core types (simplified)
```ts
// See src/plugin-sdk/index.ts
export type PluginMeta = {
  id: string; name: string; version: string; apiVersion: '1.x';
  capabilities: Array<'feed' | 'composer' | 'item-actions' | 'routes' | 'modals'>;
};

export type ComposerActionCtx = {
  insertText(text: string): void;
  navigate(to: string): void;
  storage: { get(k: string): any; set(k: string, v: any): void };
  theme: { colorScheme: 'light' | 'dark' };
  events: { emit(e: string, p?: any): void; on(e: string, h: (p: any)=>void): () => void };
  cacheLink?: (postId: string, kind: string, payload: any) => void;
  pushFeedEntry?: (kind: string, entry: any) => void;
};

export type ComposerAttachmentCtx = ComposerActionCtx & {
  getValue<T=any>(ns: string): T | undefined;
  setValue<T=any>(ns: string, value: T): void;
  ensureWallet(): Promise<{ sdk: any; currentBlockHeight?: number }>
};
```

## Attachments (recommended surface)
```ts
import { definePlugin, type ComposerAttachmentSpec } from '@superhero/plugin-sdk';

export default definePlugin({
  meta: { id: 'org.example', name: 'Example', version: '1.0.0', apiVersion: '1.x', capabilities: ['composer'] },
  setup({ register }) {
    const spec: ComposerAttachmentSpec = {
      id: 'example-attachment',
      label: 'Example',
      Panel: ({ ctx, onRemove }) => null, // render your UI
      validate: (ctx) => [],
      onAfterPost: async (ctx, post) => {
        const { sdk } = await ctx.ensureWallet();
        // interact with chain, then push feed entry if needed
        ctx.pushFeedEntry?.('example', { id: post.id, createdAt: new Date().toISOString(), kind: 'example', data: {} });
      },
    };
    register({ attachments: () => [spec] });
  }
});
```

> [!TIP]
> Use `ensureWallet()` inside attachments to request a connected wallet SDK and optional chain context (e.g., current height).

## Feed plugins
- Implement `fetchPage(page)` and `Render({ entry })`
- Use `Skeleton` for loading placeholders

## Item actions
- Gate actions with `when(entry)` and call chain or UI APIs inside `onClick`

## Routes and modals
- Contribute routes (`{ path, element }`) and `modals` as a `Record<string, React.FC>`
- Add `menu` entries to surface your feature in app navigation

## Events, storage, theme
- `events.emit/on` to integrate with host events
- `storage.get/set` for lightweight persistence
- `theme.colorScheme` to adapt visuals

> [!WARNING]
> Keep attachments lean: validate inputs, avoid heavy on-chain loops, and prefer emitting small events or pushing feed entries for off‑chain processing.

## Next
- Back to [Integrate into Superhero extension](./08-integrate-into-superhero-extension.md)
- Or continue to [AI workflows in Cursor](./09-ai-workflows-in-cursor.md)
