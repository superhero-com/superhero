# How to build a Superhero App Extension (Polls example)

This guide shows how to build a full Superhero App Extension using the Governance Polls example. You will add a feed plugin that renders polls, wire voting/revoking via Sophia contracts, add a composer attachment, integrate the Governance backend, and test locally. Follow the steps in order and commit after each step and file change using Conventional Commits.

## Prerequisites
- Node 18+, pnpm
- Funded Aeternity testnet account (for signing votes)
- Superhero dev environment and wallet
- Endpoints (confirm or adjust in runtime config):
  - NODE_URL, MIDDLEWARE_URL, AE_COMPILER_URL
  - GOVERNANCE_API_URL

## 1) Project setup
1. Clone the repo and install dependencies.
2. Start the dev server.
3. Review runtime config (`public/superconfig.json` or `window.__SUPERCONFIG__`) and ensure Governance and MDW endpoints are set.

Commit:
```bash
git commit -m "chore(dev): setup env for polls tutorial" -m "- Confirm endpoints for governance and mdw"
```

## 2) Scaffold an extension
Use the scaffold script to generate a minimal plugin.
```bash
pnpm run ext:scaffold governance-polls
```
This creates `src/plugins/governance-polls/index.tsx` and `src/plugins/governance-polls/ui/App.tsx`.

Commit:
```bash
git add src/plugins/governance-polls/
git commit -m "feat(polls): scaffold governance polls extension" -m "- Add index.tsx and UI stub"
```

## 3) Add capabilities and registration
In `src/plugins/governance-polls/index.tsx`:
- Set `capabilities: ['feed', 'composer']`
- Register `attachments: () => [pollAttachmentSpec]`
- Optionally add a route and menu for discovery

Commit:
```bash
git add src/plugins/governance-polls/index.tsx
git commit -m "feat(polls): enable feed and composer capabilities" -m "- Register poll attachment"
```

## 4) Implement the feed plugin
- Create a `PollCreatedEntryData` type and a mapper `adaptPollToEntry`.
- Implement `fetchPage(page)` that:
  - Queries open and closed polls via `GovernanceApi.getPollOrdering(false/true)`
  - For each poll, fetch creation time via MDW (contract create tx) and set `createdAt` on entries
  - Sort entries by `createdAt` descending
- Render entries using `PollCreatedCard` and `FeedRenderer`.

Commit:
```bash
git add src/plugins/governance-polls/index.tsx
git commit -m "feat(polls): implement feed plugin and renderer" -m "- Fetch open/closed polls and compute createdAt via MDW"
```

## 5) Wire voting flows (Sophia contract integration)
- Use `useAeSdk()` to get `sdk` and ensure wallet is connected before voting.
- Load the poll contract with `GovernancePollACI.json` and call `vote(option)`.
- Optimistically update UI (increment selected option, update totals) and refresh from backend.
- Implement `revoke_vote()` similarly and update UI accordingly.

Commit:
```bash
git add src/plugins/governance-polls/index.tsx
git commit -m "feat(polls): add vote and revoke handlers" -m "- Integrate aepp-sdk with GovernancePoll ACI" -m "- Optimistic UI + backend refresh"
```

## 6) Add composer attachment (create polls)
- Import `pollAttachmentSpec` from `features/social/feed-plugins/poll-attachment` and register via `attachments: () => [pollAttachmentSpec]`.
- This surfaces a poll creation UI in the composer toolbar; after posting, it runs its `onAfterPost` hook.

Commit:
```bash
git add src/plugins/governance-polls/index.tsx
git commit -m "feat(polls): register composer poll attachment" -m "- Enable poll creation from the composer"
```

## 7) Local registration (dev only)
- Temporarily import your new plugin in `src/plugins/local.ts` and add to the `localPlugins` array for local testing.
- Do not commit this if you don’t want it enabled by default; guard with an env flag if needed.

Commit:
```bash
git add src/plugins/local.ts
git commit -m "chore(dev): register governance-polls plugin locally for testing"
```

## 8) Testing
- Load the app, ensure feed renders poll cards.
- Click an option to vote; confirm signing flow and UI updates.
- Revoke vote; confirm UI updates and backend reflects the change after refresh.

Commit:
```bash
git commit -m "test(polls): verify vote/revoke flows and rendering" -m "- Manual smoke checks across key paths"
```

## 9) Backend integration notes
- Governance endpoints supply ordering, overviews and accept event submissions to speed up cache updates.
- You can change the base URL via runtime config. For advanced cases, add a tiny client wrapper (`src/plugins/governance-polls/client/backend.ts`).
- Consider WebSocket updates or polling intervals for faster UI convergence.

Commit:
```bash
git add docs/tutorials/build-governance-poll-extension.md
git commit -m "docs(polls): document backend endpoints and patterns" -m "- Notes on performance and refresh"
```

## 10) Conventional commits (policy)
- Commit after each step and after each file change
- Use types: feat, fix, refactor, docs, test, build, ci, chore
- Include scope (polls, plugins, composer) and short bullet body

Template:
```bash
git add <files>
git commit -m "<type>(<scope>): <summary>" \
  -m "- <bullet 1>" \
  -m "- <bullet 2>"
```

## 11) Troubleshooting
- Wallet not connected: ensure `useWalletConnect` flow and wallet pairing works
- Compiler/runtime mismatch: confirm `AE_COMPILER_URL` and SDK versions
- ACI mismatch or wrong contract address: recompile and point to correct address
- MDW differences: different deployments may expose slightly different transaction shapes; handle both `micro_time` and `block_time`

## 12) Submission checklist
- Extension compiles and passes `pnpm run ext:check`
- Polls render; voting flows work
- Composer poll attachment shows and works
- Conventional commits used across steps
