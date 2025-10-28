# Build Superhero Extensions with Sophia (AI‑assisted)

Hackathon‑friendly tutorial for newcomers using Cursor or other AI tools to build Superhero extensions backed by their own Sophia smart contracts.

## What you’ll build
- A minimal Poll contract (create poll, vote, close, read results)
- A TypeScript test harness that compiles, deploys, and calls the contract
- An extension that calls the contract via the JS SDK

## Fast feedback loop
1) Write/refine contract with Cursor → 2) Compile via `aesophia_http` → 3) Test with Vitest + JS SDK → 4) Integrate into an extension → 5) Deploy to devnet/testnet.

## High‑level architecture
- Contract (Sophia) ↔ ACI ↔ JS SDK (`@aeternity/aepp-sdk`) ↔ Extension UI (Superhero)

You will:
- Pin a compiler version and generate an ACI from source
- Use SDK to deploy/call in tests and from the extension
- Emit events for off‑chain indexing

## Prerequisites
- Node.js LTS, Git, Docker
- Cursor (or VS Code)
- An æternity account (local dev key for devnet; funded key for testnet)

## Minimal concepts to skim
- `state`, `init`, `entrypoint` vs `stateful entrypoint`
- `Call.caller` for auth; `Chain` for time windows
- Gas‑aware storage (prefer `Map` lookups; avoid unbounded loops)
- Guards with `require`/`abort`; small events for indexing

## Pages in this tutorial
- 01 — Setup environment
- 02 — Project scaffold
- 03 — Sophia basics for builders (10‑minute skim)
- 04 — Compiler and build
- 05 — Contract walkthrough: Poll
- 06 — Testing with Vitest
- 07 — Deploy: devnet and testnet
- 08 — Integrate into Superhero extension
- 09 — AI workflows in Cursor
- 10 — Troubleshooting & FAQ
- 11 — Security checklist
- 12 — Reference links & glossary

## Official references
- Docs hub: https://docs.aeternity.com
- Syntax: https://github.com/aeternity/aesophia/blob/master/docs/sophia_syntax.md
- Features: https://github.com/aeternity/aesophia/blob/master/docs/sophia_features.md
- Stdlib: https://github.com/aeternity/aesophia/blob/master/docs/sophia_stdlib.md
- Compiler HTTP: https://github.com/aeternity/aesophia_http
- JS SDK: https://github.com/aeternity/aepp-sdk-js
- Community Q&A: https://forum.aeternity.com/c/sophia-smart-contracts/38
