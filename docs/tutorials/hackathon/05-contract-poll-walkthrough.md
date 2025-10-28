# 05 — Contract walkthrough: Poll

Design a simple, gas‑aware poll contract newcomers can extend.

## Data model
- `Poll`: id, question, options, open/close heights, owner, isClosed
- `votesByAddress`: Address → optionIdx (one vote per address)
- `tally`: optionIdx → count (avoid iterating all voters)

## Entrypoints (suggested)
- `create_poll(question: string, options: list(string), open_h: int, close_h: int)`
- `vote(poll_id: int, option_idx: int)`
- `close(poll_id: int)`
- `get_results(poll_id: int) : list(int)` (or a record)

## Invariants & guards
- Creation: `options` length ≥ 2; unique options; `open_h < close_h`
- Voting: now in [open_h, close_h); one vote per address; index bounds
- Closing: only owner or after `close_h`; id must exist; idempotent

## Events
- `PollCreated(poll_id, owner)`
- `Voted(poll_id, voter, option_idx)`
- `Closed(poll_id)`

Keep events small. Index off‑chain when needed.

## Gas considerations
- Use `Map` for `tally` and `votesByAddress`
- Do not loop over all voters on‑chain to compute results
- Keep strings reasonably short

## Next
- [06 — Testing with Vitest](./06-testing-with-vitest.md)
