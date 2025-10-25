# Superhero Plugin SDK (v1.x)

This guide explains how to extend the app with external plugins. You can add feed entries, composer actions, and now composer attachments (inline panels like Poll).

## Concepts
- Host: the app that loads plugins at runtime
- Capabilities: `feed`, `composer` (actions, attachments), `item-actions`, `routes`, `modals`
- SDK: small, versioned API `@superhero/plugin-sdk` (local path `src/plugin-sdk`)

## Quickstart (attachments)
```ts
import { definePlugin, type ComposerAttachmentSpec } from '@superhero/plugin-sdk';

export default definePlugin({
  meta: { id: 'org.polls', name: 'Polls', version: '1.0.0', apiVersion: '1.x', capabilities: ['composer'] },
  setup({ register, ctx }) {
    const spec: ComposerAttachmentSpec = {
      id: 'poll',
      label: 'Poll',
      Panel: ({ ctx, onRemove }) => /* your UI */ null,
      validate: (ctx) => [],
      onAfterPost: async (ctx, post) => { /* async work */ },
    };
    register({ attachments: () => [spec] });
  }
});
```

## Composer attachments
Attachments add an expandable panel to the post composer. The main post text remains unchanged; attachments may validate inputs and (optionally) run async tasks after posting.

Key types (simplified):
```ts
type ComposerAttachmentCtx = {
  insertText(text: string): void;
  navigate(to: string): void;
  getValue<T>(ns: string): T | undefined;
  setValue<T>(ns: string, v: T): void;
  ensureWallet(): Promise<{ sdk: any; currentBlockHeight?: number }>;
  cacheLink?(postId: string, kind: string, payload: any): void;
  pushFeedEntry?(kind: string, entry: any): void;
};

type ComposerAttachmentSpec = {
  id: string;
  label: string;
  Panel: React.FC<{ ctx: ComposerAttachmentCtx; onRemove: () => void }>;
  validate(ctx: ComposerAttachmentCtx): { field?: string; message: string }[];
  onAfterPost(ctx: ComposerAttachmentCtx, post: { id: string; text: string }): Promise<void>;
};
```

### Poll example
- Panel with dynamic options and close height; show estimated close date/time.
- After posting, deploy the poll, then update inline cache and push a `poll-created` feed entry.

## Feed plugins
Implement `feed: FeedPlugin` with `fetchPage` and `Render` to add new item kinds to the unified feed. See `src/features/social/feed-plugins/*` for examples.

## Actions and item actions
- Composer actions: simple buttons near Emoji/GIF.
- Item actions: add contextual actions in item menus.

## Testing
- Develop locally as ESM; add your plugin URL to `CONFIG.PLUGINS`.
- Mock `ensureWallet` and `cacheLink` for unit tests.


