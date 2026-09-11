# Social, search, and profile QA

Date: 2026-09-11 UTC (2026-09-10 Pacific)

## Environment and scope

Tested the local Superhero checkout at `http://127.0.0.1:5173` using an isolated Codex in-app browser tab. The page title was verified as “Superhero.com – The All-in-One Social + Crypto App” before interaction. `http://localhost:5173` initially resolved to an unrelated application; no interaction was performed with that application.

Browser checks used anonymous state and the configured public backend. No wallet was connected, no account was created, and no post, signature, tip, or financial transaction was submitted. Production deployment was outside this subtask.

## Browser checks

| Check | Observed result |
| --- | --- |
| Desktop Connect Wallet | Opened the wallet-choice dialog with Superhero Wallet and AI-agent choices. Passkey showed unavailable at the local IP origin, so passkey registration/recovery was not exercised. |
| Desktop dialog dismissal | Escape removed the wallet dialog; the dialog count returned to zero. |
| Keyboard tip action inside a feed card | Enter on the first “Tip post” button opened the tip dialog while the URL remained `/`. The correct post author's address was shown. Escape dismissed it without sending. |
| Keyboard post navigation | Enter on the card itself opened `/post/defi-lending-hit-a-record-32-price-manipulation-exploits-in-12801`. The detail loaded its post, Replies heading, and anonymous “Please connect your wallet to reply” gate. |
| Missing chain-name profile | `/users/codex-qa-nonexistent-20260911.chain` settled to an unavailable-page message and Back control. No Tip control was rendered. |
| Mobile homepage | At 390×844, the feed and bottom navigation were usable. DOM measurements reported body/document scroll width 383 against viewport width 390, with no horizontal overflow. |
| Mobile wallet dialog | Wallet choices and terms text fitted the viewport. Tapping the backdrop dismissed the dialog; dialog count returned to zero. |
| Search debounce regression | After a settled `bitcoin` search, replacing the input with `ethereum` and immediately pressing Enter navigated to `/trends/tokens?q=ethereum`. |
| Browser errors | Captured browser error logs were empty after the flow. Development warnings concerned Vite's externalized `buffer` module. |

The temporary viewport override was reset and the created browser tab was explicitly closed. The root agent's Chrome tab was not touched.

## Implemented fixes

- Search submits the visible input immediately, hides stale query results during debounce, and stores the current search term in recents.
- Tip buttons and reply-parent context use their correct translation namespaces.
- Feed card key handlers leave nested buttons and links in control of Enter/Space, while keyboard activation of the card still opens the post/trend.
- Token creation activity URLs encode token names.
- Direct reply background loading stops after five pages. Readers retain a Load more control, and a later-page failure keeps loaded replies visible with an explicit retry.
- Chain-name profiles wait for an address before rendering account actions or issuing account requests, recognize `.Chain` case-insensitively, and key post data by resolved address. Post totals use API metadata rather than the first 100 loaded records.
- Share actions no longer repeat “Share” in their labels and use the common clipboard helper, which handles rejected clipboard promises and supports browsers without the clipboard API.

## Regression evidence

Thirteen new tests passed across these five files:

- `src/components/layout/__tests__/FeedRailSearch.test.tsx` — 2 tests
- `src/features/social/components/__tests__/DirectReplies.test.tsx` — 2 tests
- `src/features/social/components/__tests__/FeedItemKeyboard.test.tsx` — 5 tests
- `src/views/__tests__/UserProfile.test.tsx` — 2 tests
- `src/features/social/components/__tests__/SharePopover.test.tsx` — 2 tests

Run using `NODE_OPTIONS=--no-experimental-webstorage` with Vitest and `--maxWorkers=2` in the available Node 25 environment. The flag avoids that runtime's experimental web-storage collision with jsdom; it is not an application configuration change.

Profile review confirmed that unresolved names disable both account/post queries, every prefetch effect returns for an empty effective address, and resolution changes the account argument and query key together. Regression tests assert zero account/post requests for unresolved names and only resolved `ak_` addresses after lookup. No new query/error loop was observed.

Scoped ESLint completed with zero errors. The prior `DirectReplies` long-line warning and unused `UserProfile` disable-directive warnings remain. `git diff --check` passed for this scope.
