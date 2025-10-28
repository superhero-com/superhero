# 08 — Integrate into Superhero extension

Call your contract from a Superhero extension using the JS SDK and Plugin SDK.

> [!NOTE]
> New to the Plugin SDK? Read the [Plugin SDK deep dive](./08a-plugin-sdk-deep-dive.md) for capabilities and examples.

## Expose contract address
Provide a network‑specific address via env, e.g. `VITE_POLL_CONTRACT`.

## Obtain ACI
Load from source in tests, or keep a built ACI JSON alongside your extension.

## Wallet connect
Use `ensureWallet()` in attachments (or initialize via your app shell) to obtain a connected SDK before sending transactions.

## Call from the extension
- Initialize an `AeSdk` instance at app start or via `ensureWallet`
- Load the contract by address and ACI
- Call view/stateful methods accordingly

Sketch:
```ts
import { AeSdk, Node } from '@aeternity/aepp-sdk'

const aeSdk = new AeSdk({
  nodes: [{ name: 'net', instance: new Node(import.meta.env.VITE_NODE_URL) }],
  compilerUrl: import.meta.env.VITE_COMPILER_URL,
})

// later
const contract = await aeSdk.getContractInstance({
  aci: pollAciJson,
  address: import.meta.env.VITE_POLL_CONTRACT,
})

const results = await contract.methods.get_results(0)
```

> [!TIP]
> Consider emitting small on‑chain events and handling heavy processing off‑chain, then pushing entries into the feed via `pushFeedEntry`.

## UI/UX tips
- Disable action buttons if not in open window or while pending
- Reflect on‑chain errors with friendly messages
- Show tallies and event‑driven updates

## Next
- Continue to [Plugin SDK deep dive](./08a-plugin-sdk-deep-dive.md) or
- Jump to [AI workflows in Cursor](./09-ai-workflows-in-cursor.md)
