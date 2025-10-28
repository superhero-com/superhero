# Sophia Basics for Builders

You can rely on Cursor to scaffold most code, but read this once to avoid pitfalls.

## Core concepts
- Contract structure: `contract`, `record state`, `init`, `entrypoint`, `stateful entrypoint`
- Auth: `Call.caller` for owner/role checks; enforce one‑vote‑per‑address
- Time: choose `Chain.height` or timestamp; enforce open/close windows consistently
- Data structures: prefer `Map` for lookups; avoid unbounded loops over growing lists
- Errors: `require`/`abort` with clear messages; fail early
- Events: emit small events for create/vote/close; useful for off‑chain indexing

## Minimal code patterns
- Guard first, then mutate state
- Validate indices (option bounds)
- Keep return types simple for SDK decoding

## Where to skim in the docs
- Syntax: https://github.com/aeternity/aesophia/blob/master/docs/sophia_syntax.md
- Features (state, entrypoints, exceptions, events): https://github.com/aeternity/aesophia/blob/master/docs/sophia_features.md
- Stdlib (Map, List, Option, Chain, Call): https://github.com/aeternity/aesophia/blob/master/docs/sophia_stdlib.md

## Next
- [04 — Compiler and build](./04-compiler-and-build.md)
- [05 — Contract walkthrough: Poll](./05-contract-poll-walkthrough.md)
