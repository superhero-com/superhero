# Operations and Support

## AI Workflows in Cursor
- Scaffold contract: describe rules and ask Cursor to generate state and entrypoints
- Tighten invariants: add `require` checks (time window, unique vote, bounds)
- Extend tests: add negative cases first, then fix the contract
- Gas review: avoid unbounded loops; use `Map` lookups; keep events small

## Troubleshooting & FAQ
- Compiler version error: adjust pragma or image version
- Cannot reach compiler: ensure Docker container on `:3080`; check env
- Decoding errors: simplify return types; ensure ACI matches bytecode
- Testnet tx failures: ensure funded key; verify gas/fee and URL
- Debug quickly: dry‑run calls; add temporary view entrypoints (remove before deploy)
- Where to ask for help: [Community Q&A](https://forum.aeternity.com/c/sophia-smart-contracts/38)

## Security Checklist
- Auth: use `Call.caller`; reject unauthorized changes early
- Time windows: enforce open/close consistently; prevent late voting
- Input validation: non‑empty question; ≥ 2 options; index bounds; unique options
- One vote per address: guard via `votesByAddress`
- Gas & storage: use `Map`; avoid unbounded loops; keep strings small
- Events: emit `PollCreated`, `Voted`, `Closed` with small payloads
- ACI: simple return types; stable entrypoint names
- Testing: include negative cases; dry‑run heavy paths
- Versioning: pin compiler; document init args; plan migrations

## Final Checklist
- Env ready (`VITE_*`); addresses configured per network
- Contract pinned and tested (positive + negative)
- Integration wired (wallet connect; ACI loaded; errors handled)
- Data fetches scoped/paginated; plan for rate limits
- README includes setup and env docs; include contract addresses and sample accounts

## References
- [Docs hub](https://docs.aeternity.com)
- [Sophia syntax](https://github.com/aeternity/aesophia/blob/master/docs/sophia_syntax.md)
- [Sophia features](https://github.com/aeternity/aesophia/blob/master/docs/sophia_features.md)
- [Sophia stdlib](https://github.com/aeternity/aesophia/blob/master/docs/sophia_stdlib.md)
- [Sophia compiler (HTTP)](https://github.com/aeternity/aesophia_http)
- [JS SDK](https://github.com/aeternity/aepp-sdk-js)
