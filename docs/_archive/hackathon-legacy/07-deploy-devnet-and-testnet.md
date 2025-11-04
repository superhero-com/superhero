# Deploy: Devnet and Testnet

Run your tests and deployments against a local devnet or the public testnet.

## Devnet (local)
- Start a local node (see official docs) and point `NODE_URL` to it
- Use the local Sophia HTTP compiler at `http://localhost:3080`
- Fund your dev key in the local node if needed (or use pre-funded accounts)

## Testnet (public)
- Set `.env.testnet` with:
```
NODE_URL=https://testnet.aeternity.io
COMPILER_URL=http://localhost:3080
SECRET_KEY=your_funded_testnet_private_key_hex
```
- Fund your test key using the official faucet (see docs hub for current link)

## Deploy once, reuse address
In longer tests, deploy once and reuse the contract address to reduce cost/time. Persist addresses per network (e.g., `.contracts.testnet.json`).

## Sanity checks before testnet deploy
- All negative tests pass locally
- Compiler version pinned and consistent
- Events are emitted where needed for indexing

## Next
- [08 — Integrate into Superhero extension](./08-integrate-into-superhero-extension.md)
