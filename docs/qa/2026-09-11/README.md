# Superhero.com bug audit and fixes

Audit date: September 11, 2026 UTC / September 10 Pacific. Fix branch starts from the verified production `main` commit `50911e9da1fe55c35e21e8f5fdd8273fffdf4d7f`, excluding unrelated changes on `develop`.

## Live product and delivery

Superhero.com serves the React/Vite social and crypto application from `superhero-com/superhero`. Its public surfaces include the social feed, post detail, profiles/SuperheroID, token discovery and markets, DEX swaps and liquidity, DAO proposals, rewards, wallet onboarding and informational pages. Caddy fronts the Express container. Live asset filenames match the successful September 9 production build and Docker image.

See [the HTTP report](http-production-audit.md) and [248 request records](http-production-audit.json). An HTTP 200 SPA shell is not evidence of a functioning authenticated transaction.

## Fixes prepared for review

| Area | Defect and corrected behavior |
| --- | --- |
| Swap quotes | Old asynchronous quotes could survive cleared/changed inputs; the form now invalidates them and blocks execution while quoting or after an error. A failed router quote cannot become an executable reserve-ratio estimate. |
| Swap confirmation | Fractional input/output amounts produced incorrect exchange rates because the denominator was clamped to at least 1; rates now use the actual amounts. |
| DEX links | Asynchronous token-lookup errors escaped their catch; legacy `/explore/tokens/:id` links never provided the expected parameter. Both paths now resolve or fail safely. |
| DAO proposals | Selected proposal types were submitted as payouts, subject validation used the wrong address type, Map proposal counts read as zero, and failures could leave controls busy. Inputs now match the pinned contract/SDK schema and failures recover. |
| DAO voting | Apply was not wired up; percentages used incorrect integer/scaling arithmetic. Eligibility now follows the pinned contract thresholds and action handling has regression coverage for route changes, failures and duplicate calls. |
| Search | Immediate Enter could submit the previous debounced query, and old hits stayed clickable. The current input now drives navigation and stale hits are hidden. |
| Post controls | Parent cards intercepted Enter/Space intended for nested tip/share/author controls. Nested controls retain keyboard behavior. Activity token URLs are encoded. |
| Replies | Automatic reply loading repeatedly reset its page cap; it is now bounded, with manual continuation and retry that retains already loaded replies. |
| Profiles | Chain names were sent to account endpoints before resolution and cached under the unresolved name. Queries/actions now wait for the resolved address; post counts use API totals rather than the first 100 records. |
| Labels and sharing | Tip/reply labels displayed translation keys, share labels repeated words, clipboard rejections escaped handling, and rewards repeated its invitations heading. |
| Mobile token price | An AE-denominated price was prefixed with `$`. The header now labels AE and preserves unavailable data rather than fabricating zero values. |
| Responsive token page | The header Trade action did nothing at tablet widths, and a narrow desktop sidebar overflowed. A tabbed layout is used below 1280px; wider layouts reserve enough space for trading. Chart statistics wrap without covering the price axis. |
| Server metadata | TLS termination caused HTTP canonical/social URLs; head injection also duplicated titles. Public origins and replacement metadata now have dedicated tests. |
| Missing assets | Missing images, media, documents and discovery files returned HTML with HTTP 200. Recognized missing assets now return 404 while existing SPA routes remain supported. |
| Deployment failures | Failed image pulls were ignored before the serving container was stopped. Login/pull failure now stops the script before replacement; REVISION is written only after the new container starts. A fake-Docker shell regression verifies failure behavior without contacting production. |

## Browser checks

The production browser pass covered feed/Explore navigation, token details and charts, mobile Feed/Trade tabs, the mobile navigation menu, swap balance/empty-input gates and settings dismissal, wrapping, liquidity pools, DAO directory/detail, rewards and the signed-in profile surface. No post, external message, account creation, signature or financial transaction was submitted.

The fixed app was then checked at `http://127.0.0.1:5173` in anonymous browser state. See [the social browser report](browser-social-audit.md) for wallet entry/dismissal, keyboard tip/post actions, missing profiles and immediate search submission.

Responsive regression observations:

- 390×844: token header shows `0.000606 AE`; feed and mobile navigation fit.
- 768×1024: before correction the Trade action only changed the URL; after correction its visible trading sheet opens, and Cancel removes `openTrade` from the URL.
- 1024×900: before correction the document extended to 1110px; after correction it fits within the viewport (1009px content width, excluding scrollbar), retains its token heading and tab controls.
- 1280×900: the desktop feed and trading sidebar fit (1265px document width, excluding scrollbar).

## Validation and limits

Full-suite/build/lint/type results and the submitted change revision are recorded in `validation.md`. Server checks include [11 actual local HTTP regressions](http-local-regression.json), unit/component regressions, and the deployment shell simulation.

The local Mac required `npm ci --ignore-scripts`, followed by the repository's package compatibility script and the pinned `bctsl-sdk` TypeScript build, because a legacy native Argon2 preparation script failed under Node 25. Tests use `NODE_OPTIONS=--no-experimental-webstorage` to avoid Node 25's experimental storage collision with jsdom. No lockfile or production runtime setting was changed for this workaround.

Real passkey ceremonies, wallet recovery, signing, token purchases/sales, liquidity transfers, paid proposals, reward payouts and authenticated chat were not executed. Financial behavior is covered by mocked SDK/contract regressions and source review, not by a mainnet transaction. The existing CI browser/screenshot jobs remain separate gates. Unknown document URLs retain the existing SPA HTTP 200 behavior, and full deployment health-check/rollback orchestration remains future work.

## Production gate

The current GitHub account has READ permission on the upstream repository and cannot deploy or merge its protected `main`. These are local/fork changes until a maintainer reviews and merges them and the production deployment completes. The published site must then be retested; the audit does not claim public fixes are already live.
