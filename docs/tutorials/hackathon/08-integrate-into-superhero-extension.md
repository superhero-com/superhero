# 08 — Integrate into Superhero extension

Call your contract from a Superhero extension using the JS SDK.

## Expose contract address
Provide a network‑specific address via env, e.g. `VITE_POLL_CONTRACT`.

## Obtain ACI
Use the SDK to load from source (in tests) or keep a built ACI JSON alongside your extension.

## Call from the extension
- Initialize an `AeSdk` instance at app start
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

## UI/UX tips
- Disable vote button if not in open window
- Reflect on‑chain errors with friendly messages
- Show tallies and event‑driven updates

## Next
- 09 — AI workflows in Cursor
