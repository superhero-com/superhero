# Test and Deploy

## Recommended: aeproject

### Run tests
```bash
# If your project has tests scaffolded by aeproject
aeproject test
```
This command compiles contracts and runs the test suite using the project’s configuration.

### Deploy
```bash
# Local devnet (node started via `aeproject node`)
aeproject deploy

# Example: deploy to testnet (ensure a funded key is configured)
aeproject deploy --network testnet
```

!!! tip
    See `aeproject --help` for supported networks and config options.

## Optional: SDK + Vitest path
If you prefer a custom SDK test harness, use the example below.

Ensure `.env.local` or `.env.testnet` is set.

Example test:
```ts
// tests/poll.test.ts
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import 'dotenv/config'
import { AeSdk, Node, MemoryAccount } from '@aeternity/aepp-sdk'

const NODE_URL = process.env.NODE_URL!
const COMPILER_URL = process.env.COMPILER_URL!
const SECRET_KEY = process.env.SECRET_KEY!

describe('Poll contract', () => {
  it('compiles, deploys, and allows a vote', async () => {
    const node = new Node(NODE_URL)
    const aeSdk = new AeSdk({
      nodes: [{ name: 'net', instance: node }],
      compilerUrl: COMPILER_URL,
      accounts: [new MemoryAccount(SECRET_KEY)],
    })

    const source = readFileSync('contracts/Poll.aes', 'utf8')

    const contract = await aeSdk.getContractInstance({ source })
    await contract.deploy(['My poll?', ['Yes', 'No'], 100000])

    const voteTx = await contract.methods.vote(0, 0)
    expect(voteTx.hash).toBeDefined()

    const res = await contract.methods.get_results(0)
    expect(res.decodedResult).toBeDefined()
  })
})

Negative tests to add:
- Duplicate vote should fail
- Voting outside open/close window should fail
- Invalid option index should fail

## Deploy sanity checks
- All negative tests pass locally
- Compiler version pinned and consistent
- Events emitted where needed for indexing
