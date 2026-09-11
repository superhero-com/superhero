# Validation record

Base: production `main` commit `50911e9da1fe55c35e21e8f5fdd8273fffdf4d7f`.
Fix branch: `codex/superhero-live-bug-audit`.
Verified September 11, 2026 UTC / September 10 Pacific.

| Check | Result |
| --- | --- |
| Full Vitest suite | **1,370 passed, 2 skipped; 159 passing files, 2 skipped files**. Run began 20:58:52 Pacific and completed in 67.75 seconds. |
| Production Vite build | Passed, 13.86 seconds. Existing large-bundle warnings remain. |
| ESLint | Passed with **0 errors, 205 warnings**; warnings are not represented as a clean warning-free lint run. |
| Repository type ratchet | Passed at its existing **95-error baseline**. The baseline was not raised, and this does not claim full TypeScript correctness. |
| CSP origin check | Passed: 28 permitted origins. Azure's `disk.azure.com` OAuth resource-scope string is classified as library noise after checking its source; no CSP permission was expanded. |
| Server regression HTTP | 11 passing local checks; see `http-local-regression.json`. |
| Deployment shell | 3 passing simulations: failed Docker login/pull preserve the current container; failed start does not claim the new revision; successful start records it. No production Docker/SSH command was executed. |
| Production HTTP | 248 read-only requests; 156 bundle/icon assets and 12 public API checks succeeded. See `http-production-audit.json` for raw results and limitations. |
| Browser interactions | Live product navigation plus anonymous local wallet-entry, keyboard, profile/search and responsive flows passed within the scope recorded in README and browser-social-audit. |
| Whitespace | `git diff --check` passed. |

Unit command: `NODE_OPTIONS=--no-experimental-webstorage npx vitest run --maxWorkers=4`.
Other commands: `npm run build`, `npm run lint`, `npm run check:types`, `npm run check:csp-origins`.

CI's real browser CSP/Trusted Types soak, screenshot and wallet-surface jobs have not been represented as locally executed. Their results must be inspected on the pull request. Production signing, trades, payouts, paid proposals, posting and authenticated chat were not executed.

The review included independent checks of DAO contract thresholds, subject encoding, route/network/account context changes, pending-action completion and proposal ID/address binding. Focused DAO/DEX tests cover these cases with mocked signing/contract operations.

Production remains the verified September 9 release until a maintainer merges the branch and deployment succeeds; public verification is still required after that deployment.
