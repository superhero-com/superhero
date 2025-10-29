# Integrate and Plugin SDK

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

!!! note
    New to the Plugin SDK? See below for capabilities and examples.

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

!!! tip
    Emit small on‑chain events and push entries to the feed via `pushFeedEntry` for heavier off‑chain work.

## Plugin SDK Deep Dive

### Capabilities (v1.x)
- `feed`: add new item kinds to the unified feed
- `composer`: add actions and attachments (interactive panels)
- `item-actions`: contextual actions on feed items
- `routes`: add pages to the app router
- `modals`: register reusable modals
- `menu`: contribute navigation items

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

!!! warning
    Keep attachments lean: validate inputs, avoid heavy on-chain loops, and prefer emitting small events or pushing feed entries for off‑chain processing.
