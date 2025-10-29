# AI Workflows in Cursor

Use AI effectively while keeping control of correctness and gas.

## Prompt recipes
- Scaffold contract
  - “Create a Sophia Poll contract with state: question, options, open/close heights, one vote per address. Add events and guards.”
- Tighten invariants
  - “Add `require` checks for time window and unique voting; validate option index; return clear errors.”
- Extend tests
  - “Add Vitest cases for duplicate vote, before open, after close, and invalid index.”
- Gas review
  - “Replace list scans with `Map` lookups; avoid unbounded loops; keep events minimal.”

## Verification loop
1) Run tests
2) If failing, ask AI to propose minimal edits
3) Re-run tests and inspect diffs

## Pitfalls
- Hallucinated SDK APIs → check `@aeternity/aepp-sdk` docs
- Version mismatches → pin compiler and SDK; verify with a small compile test
- Large loops or strings → watch gas usage

## Next
- [10 — Troubleshooting & FAQ](./10-troubleshooting-and-faq.md)
