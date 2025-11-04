# Testing with Vitest

Compile, deploy, and call your Sophia contract using the JS SDK in Vitest.

## Setup
Ensure you have `.env.local` or `.env.testnet` prepared.

## Example test
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
```

## Negative tests to add
- Duplicate vote should fail
- Voting outside open/close window should fail
- Invalid option index should fail

## Tips
- Use small strings for options and questions
- Prefer height windows for deterministic tests

## Next
- [07 — Deploy: devnet and testnet](./07-deploy-devnet-and-testnet.md)
