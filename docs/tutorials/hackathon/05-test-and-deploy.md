# Test and Deploy

## Testing with Vitest
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

## Deploy: Devnet and Testnet
- Devnet/local: start a node and point `NODE_URL` to it; use compiler at `http://localhost:3080`
- Testnet: set `.env.testnet` with a funded key; deploy for live testing

Sanity checks before testnet:
- All negative tests pass locally
- Compiler version pinned and consistent
- Events emitted where needed for indexing
