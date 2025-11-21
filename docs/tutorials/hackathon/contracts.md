---
title: Smart Contracts
---

## Sophia basics (skim)
- Contract structure: `contract`, `record state`, `init`, `entrypoint`, `stateful entrypoint`
- Auth: `Call.caller` for owner/role checks; enforce one‑vote‑per‑address
- Time: choose `Chain.height` or timestamp; enforce open/close windows consistently
- Data structures: prefer `Map` for lookups; avoid unbounded loops
- Errors: `require`/`abort` with clear messages
- Events: emit small events for create/vote/close; useful for indexing

## Poll example (walkthrough)
### Data model
- `Poll`: id, question, options, open/close heights, owner, isClosed
- `votesByAddress`: Address → optionIdx (one vote per address)
- `tally`: optionIdx → count (avoid iterating all voters)

### Entrypoints (suggested)
- `create_poll(question: string, options: list(string), open_h: int, close_h: int)`
- `vote(poll_id: int, option_idx: int)`
- `close(poll_id: int)`
- `get_results(poll_id: int) : list(int)`

### Invariants & guards
- Creation: `options` length ≥ 2; unique options; `open_h < close_h`
- Voting: now in [open_h, close_h); one vote per address; index bounds
- Closing: only owner or after `close_h`; id must exist; idempotent

### Events
- `PollCreated(poll_id, owner)`
- `Voted(poll_id, voter, option_idx)`
- `Closed(poll_id)`

### Gas considerations
- Use `Map` for `tally` and `votesByAddress`
- Avoid loops over all voters to compute results
- Keep strings short

## Next Steps

- **[Testing & Deployment](./test-and-deploy)** - Test and deploy your contracts
- **[Plugin Integration](./integrate-and-plugin-sdk)** - Integrate your contract into Superhero

## Further Reading

- **[References](./references)** - Complete list of documentation links
- [Sophia Syntax](https://github.com/aeternity/aesophia/blob/master/docs/sophia_syntax.md) - Language syntax reference
- [Sophia Features](https://github.com/aeternity/aesophia/blob/master/docs/sophia_features.md) - Language features
- [Sophia Stdlib](https://github.com/aeternity/aesophia/blob/master/docs/sophia_stdlib.md) - Standard library
