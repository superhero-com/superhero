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

## Translations

Plugins can include their own translation files. Each plugin's translations are automatically registered using the plugin ID as the i18n namespace.

### Structure

Create a `locales/` directory in your plugin:

```
src/plugins/social/my-plugin/
├── index.tsx
├── locales/
│   ├── en.json
│   └── index.ts
└── components/
    └── MyPluginCard.tsx
```

### Translation Files

**`locales/en.json`:**
```json
{
  "createdAPoll": "created a poll",
  "pending": "Pending…",
  "yourVote": "Your vote",
  "retractVote": "Retract vote",
  "votes": "votes",
  "actions": {
    "like": "Like",
    "share": "Share"
  }
}
```

**`locales/index.ts`:**
```typescript
import en from './en.json';

export const translations = {
  en,
  // Add more languages:
  // de: require('./de.json'),
  // fr: require('./fr.json'),
};
```

### Exporting Translations

In your plugin definition, export translations:

```typescript
import { definePlugin } from '@/plugin-sdk';
import { translations } from './locales';

export default definePlugin({
  meta: {
    id: 'my-plugin',  // This becomes the i18n namespace
    // ...
  },
  translations,  // Export translations
  setup({ register }) {
    // ...
  },
});
```

### Using in Components

Use the plugin ID as the namespace in your React components:

```typescript
import { useTranslation } from 'react-i18next';

export default function MyPluginCard() {
  // Use plugin ID as namespace
  const { t } = useTranslation('my-plugin');
  
  return (
    <div>
      <span>{t('createdAPoll')}</span>
      <span>{t('pending')}</span>
      <span>{t('actions.like')}</span>
    </div>
  );
}
```

### Multi-language Support

To add more languages:

1. Create additional JSON files: `locales/de.json`, `locales/fr.json`, etc.
2. Export them in `locales/index.ts`:
   ```typescript
   import en from './en.json';
   import de from './de.json';
   
   export const translations = { en, de };
   ```
3. Translations are automatically registered when the plugin loads.

### Benefits

- **Self-contained**: Each plugin manages its own translations
- **Namespace isolation**: Plugin ID becomes the i18n namespace, preventing conflicts
- **Easy to extend**: Add language files as needed
- **Works for external plugins**: External plugins can bundle their own translations

## Testing
- Develop locally as ESM; add your plugin URL to `CONFIG.PLUGINS`.
- Mock `ensureWallet` and `cacheLink` for unit tests.


