# Checklist & Deploy Extension

Use this checklist before you submit or deploy your hackathon project.

## Technical
- Env: `VITE_*` variables set for node/compiler/contract addresses
- Contract: compiler version pinned; events emitted where needed
- Tests: happy/negative paths; no flaky height assumptions
- Integration: wallet connect flow; ACI loaded; error handling in UI
- Data: middleware queries scoped/paginated; plan for rate limits

## UX
- Clear affordances; disabled states while pending
- Friendly error messages; confirmations
- Dark/light theme compatible (use `theme.colorScheme`)

## Security
- One‑vote‑per‑address (if voting); input validation
- Avoid unbounded loops and large payloads
- Never expose private keys; use Wallet for signing

!!! important
    Review the [Security checklist](./11-security-checklist.md) before deploying.

## Submission & deploy
- Include README with setup and env docs
- Provide testnet contract addresses and sample accounts
- Optional: link to a short demo video

## Next
- Back to [Overview](./00-overview.md) or [Quickstart](./00a-quickstart.md)
