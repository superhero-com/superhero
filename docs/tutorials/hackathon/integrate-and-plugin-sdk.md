---
title: Plugin Integration
---

## Integrate into Superhero (where code goes)
Call your contract from a Superhero plugin using the JS SDK and Plugin SDK.

Folder layout in this repo:
```
src/plugins/your-plugin/
  index.tsx                # exports `definePlugin({...})` (entry)
  contract-artifacts/      # optional: copied ACI JSON, addresses
  components/...           # your UI
```

Register your plugin in `src/plugins/local.ts` (static import + add to the `localPlugins` array):
```ts
// src/plugins/local.ts
import yourPlugin from '@/plugins/your-plugin';

const localPlugins = [
  // ...other plugins
  yourPlugin,
];
```

<Info>
New to the Plugin SDK? See below for capabilities and examples.
</Info>

## Bring in your contract artifacts
- Address: read from your contracts repo (e.g., `deployments/testnet/Poll.address`).
- ACI: use the compiled JSON (e.g., `aci/Poll.json`) to instantiate the contract via the JS SDK.

Options:

- Publish artifacts from the contracts repo (package, URL, or raw files) and import them in your plugin.
- For hackathons, you can copy them into `src/plugins/your-plugin/contract-artifacts/` and reference locally.

### Expose contract address
Provide a network‑specific address via env, e.g. `VITE_POLL_CONTRACT` in `.env.local`.

### Obtain ACI
Load from source in tests, or keep a built ACI JSON alongside your plugin.

### Wallet connect
Use `ensureWallet()` in attachments (or initialize via your app shell) to obtain a connected SDK before sending transactions.

### Plugin entry skeleton
```ts
// src/plugins/your-plugin/index.tsx
import { definePlugin, type ComposerAttachmentSpec } from '@/plugin-sdk';

export default definePlugin({
  meta: { id: 'your-plugin', name: 'Your Plugin', version: '0.1.0', apiVersion: '1.x', capabilities: ['composer'] },
  setup({ register }) {
    const attachment: ComposerAttachmentSpec = {
      id: 'your-attachment',
      label: 'Your Action',
      Panel: () => null,
      validate: () => [],
      onAfterPost: async (ctx) => {
        const { sdk } = await ctx.ensureWallet();
        // use sdk + your ACI/address here
      },
    };
    register({ attachments: () => [attachment] });
  },
});
```

### Add translations (optional)

Plugins can include their own translation files for internationalization. Each plugin's translations are automatically registered using the plugin ID as the i18n namespace.

**1. Create `locales/` directory structure:**
```
src/plugins/your-plugin/
├── index.tsx
├── locales/
│   ├── en.json
│   └── index.ts
└── components/
    └── YourComponent.tsx
```

**2. Create `locales/en.json` with your translation keys:**
```json
{
  "createdItem": "created an item",
  "pending": "Pending…",
  "actions": {
    "like": "Like",
    "share": "Share"
  }
}
```

**3. Create `locales/index.ts` to export translations:**
```ts
import en from './en.json';

export const translations = {
  en,
  // Add more languages:
  // de: require('./de.json'),
  // fr: require('./fr.json'),
};
```

**4. Import and export translations in your plugin definition:**
```ts
// src/plugins/your-plugin/index.tsx
import { definePlugin, type ComposerAttachmentSpec } from '@/plugin-sdk';
import { translations } from './locales';

export default definePlugin({
  meta: { id: 'your-plugin', name: 'Your Plugin', version: '0.1.0', apiVersion: '1.x', capabilities: ['composer'] },
  translations,  // Export translations
  setup({ register }) {
    // ...
  },
});
```

**5. Use translations in your components:**
```ts
import { useTranslation } from 'react-i18next';

export default function YourComponent() {
  // Use plugin ID as namespace
  const { t } = useTranslation('your-plugin');
  
  return (
    <div>
      <span>{t('createdItem')}</span>
      <span>{t('pending')}</span>
      <span>{t('actions.like')}</span>
    </div>
  );
}
```

<Tip>
See the [Plugin SDK docs](../plugin-sdk.md#translations) for more details on translations and multi-language support.
</Tip>

### Example
```ts
import { AeSdk, Node } from '@aeternity/aepp-sdk'

const aeSdk = new AeSdk({
  nodes: [{ name: 'net', instance: new Node(import.meta.env.VITE_NODE_URL) }],
  compilerUrl: import.meta.env.VITE_COMPILER_URL,
})

const contract = await aeSdk.getContractInstance({
  aci: pollAciJson,
  address: import.meta.env.VITE_POLL_CONTRACT,
})

const results = await contract.methods.get_results(0)
```

<Tip>
Emit small on‑chain events and push entries to the feed via `pushFeedEntry` for heavier off‑chain work.
</Tip>

## Plugin SDK Capabilities

### Core Capabilities (v1.x)
- `feed`: add new item kinds to the unified feed (see [Feed Plugins Guide](./feed-plugins.md))
- `composer`: add actions and attachments (interactive panels)
- `item-actions`: contextual actions on feed items
- `routes`: add pages to the app router
- `modals`: register reusable modals
- `menu`: contribute navigation items

### Popular Feed Integration

Plugins can contribute content to the popular feed through:

1. **Frontend Feed Plugins**: Register feed plugins with proper ID format (`{plugin-name}:{id}`)
   - See [Feed Plugins](./feed-plugins.md) for complete guide
   
2. **Backend API Plugins**: Implement `PopularRankingContributor` interface
   - See [API Plugin Development](./api-plugin-development.md) for backend integration

## Next Steps

- **[Feed Plugins](./feed-plugins.md)** - Add content to the unified feed
- **[API Plugin Development](./api-plugin-development.md)** - Build backend plugins
- **[Plugin SDK Documentation](../plugin-sdk.md)** - Complete API reference
- **[Hints & Tips](./hints.md)** - Development tips and troubleshooting

### Core types (simplified)
```ts
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

### Attachment example
```ts
import { definePlugin, type ComposerAttachmentSpec } from '@superhero/plugin-sdk';

export default definePlugin({
  meta: { id: 'org.example', name: 'Example', version: '1.0.0', apiVersion: '1.x', capabilities: ['composer'] },
  setup({ register }) {
    const spec: ComposerAttachmentSpec = {
      id: 'example-attachment',
      label: 'Example',
      Panel: ({ ctx, onRemove }) => null,
      validate: (ctx) => [],
      onAfterPost: async (ctx, post) => {
        const { sdk } = await ctx.ensureWallet();
        ctx.pushFeedEntry?.('example', { id: post.id, createdAt: new Date().toISOString(), kind: 'example', data: {} });
      },
    };
    register({ attachments: () => [spec] });
  }
});
```

<Warning>
Keep attachments lean: validate inputs, avoid heavy on-chain loops, and prefer emitting small events or pushing feed entries for off‑chain processing.
</Warning>
