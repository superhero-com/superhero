# Security Checklist

Use this before deploying to testnet/mainnet.

- Auth
  - Use `Call.caller` and check owner/admin where required
  - Reject unauthorized state changes early
- Time windows
  - Enforce open/close windows consistently (height or timestamp)
  - Prevent voting after close; prevent closing before close unless owner
- Input validation
  - Non‑empty question; ≥ 2 options; option indices in range; unique options
- One vote per address
  - Track in `votesByAddress`; guard with `require`
- Gas & storage
  - Use `Map` for tallies; avoid unbounded loops; keep strings small
- Events
  - Emit `PollCreated`, `Voted`, `Closed`; keep payloads minimal
- ACI & interface
  - Keep return types simple; maintain stable entrypoint names
- Testing
  - Negative tests for all guards; dry‑run for heavy paths
- Versioning
  - Pin compiler version; document init args; plan for migration
