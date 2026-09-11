# Superhero production HTTP audit — 2026-09-11

Checked at **2026-09-11T03:48:01.727708+00:00**. These are observations of the currently deployed production release, before the local fixes in this audit are deployed.

## What is live

- Repository: [superhero-com/superhero](https://github.com/superhero-com/superhero), production branch `main`, commit `50911e9da1fe55c35e21e8f5fdd8273fffdf4d7f`.
- [Dockerhub / production run 34340668118](https://github.com/superhero-com/superhero/actions/runs/34340668118) successfully built and deployed on September 9, 2026.
- Live `main-BN1jmYd7.js` and `main-Sd05zXEA.css` exactly match the filenames in that build log. The image digest built and pulled in its successful production SSH job is `sha256:eeb7dda1d8a6cfd5fec159d3237913624c07392df650506bc1ad45fd258b2f96`.
- Caddy terminates HTTPS and proxies an Express SPA/SEO server. The app is a social feed with posts, profiles, token/trend discovery, token trading/DEX, wallets, governance and chat routes.

## HTTP results

**248 bounded GET/HEAD requests: 247 returned 200, one returned an expected 404, and none had a transport error.**

| Surface | Checks | Result |
| --- | ---: | --- |
| Source-defined routes plus homepage | 68 | All delivered HTML and the app shell |
| Bundle-referenced assets and manifest icons | 156 | 144 JavaScript, 8 CSS, 3 PNG, 1 SVG; all 200 with matching MIME types |
| Public APIs | 12 | All 200 with valid JSON |
| Robots, sitemap, manifest, OG image, Apple icon | 5 | All 200 with matching MIME types |
| Redirect entry points | 2 | HTTP apex and HTTPS www reached HTTPS apex |
| Missing JS | 1 | Correct 404 text/plain |
| Missing PNG | 1 | Incorrect 200 text/html |
| Unknown page and dev-only wallet-lab URL | 2 | 200 app shells; HTTP does not establish which client view renders |
| Main bundle body | 1 | 200; SHA-256 saved in JSON evidence |

The 67 source-route probes were derived from `origin/main:src/routes.tsx`. Dynamic post/profile/token/pool routes use sampled public identifiers. DAO-vote and transaction route probes include placeholder identifiers and establish only document routing. Legacy React redirects deliver an HTTP 200 shell before browser execution; they are not HTTP redirects.

The 12 public API checks cover posts, popular posts, post detail, comments, accounts, trend tokens, DEX tokens/pairs/transactions, statistics, factory and contracts. The JSON contains each request's exact URL, status, MIME type, elapsed time, selected headers and body hash. Asset checks use HEAD except for the fetched main bundle.

## Confirmed delivery defects

1. **Incorrect HTTP canonical and social URLs:** all 68 homepage/source-route responses with metadata advertise `http://superhero.com` despite HTTPS delivery. The backend builds origins from its internal HTTP request. Fixed locally in `server/lib/origin.cjs` and `server/index.cjs`; production remains unchanged until deployment.
2. **Duplicate title elements:** all 68 homepage/source-route HTML responses contain the template title plus an injected title. Fixed locally in the Express and Netlify head injectors, with regression coverage.
3. **Missing image returns HTML:** `https://superhero.com/qa-missing.png` returns the SPA shell with 200 and a canonical URL, whereas missing JavaScript correctly returns 404. The live server classifies scripts/styles/fonts as subresources but omits images/media. Fixed locally by extending the guard to recognized image, media, PDF, manifest and discovery files; `.chain` and other document routes remain supported.

## Existing SPA routing behavior

**Unknown route returns an HTTP shell:** `https://superhero.com/_qa_unknown_route_2026-09-11` returns 200. Browser verification must distinguish the app's NotFound view from server delivery status. `wallet-lab` also returns a shell; this is not evidence that the development-only component is shipped.

## Discovery and install metadata

- `robots.txt`: permits crawling and points to `https://superhero.com/sitemap.xml`.
- `sitemap.xml`: valid XML with 9 HTTPS URLs: homepage, FAQ, landing, whitepaper, token list, DEX swap, terms, privacy and branding. Existing [PR #678](https://github.com/superhero-com/superhero/pull/678) separately proposes expanded crawlable hubs and sitemap coverage.
- Manifest: valid JSON; name/short name `Superhero`, id/start URL/scope `/`, display `standalone`. Listed icons return 200 with image MIME types.
- Hashed assets have one-year immutable caching. The manifest currently has a one-day cache lifetime. Homepage response includes CSP, HSTS, nosniff and referrer policy headers.

## Deployment path and remaining gate

A merge/push to `main` triggers `.github/workflows/dockerhub.yaml`, builds the Docker `:main` tag, then invokes `deploy_main.yaml` and `ssh_deploy.yaml`. Production container: `production-superhero-mainnet`; published host port: 3003. The current GitHub identity has repository READ access (`pull=true`, `push=false`, no maintain/admin permission), and main is protected. A maintainer must review/merge and complete the production workflow; these local fixes are not publicly deployed.

The production workflow also masks image-pull failure with `docker pull ... || true` before stopping/removing the old container. The local fix now stops on login/pull failure and records REVISION only after container startup; three simulated shell regressions pass. Full health-check rollback is not implemented, and production remains unchanged until this workflow patch is merged.

## Verification limits

This sweep verifies read-only HTTP delivery and public API availability. It does not prove rendered page behavior, all entity correctness, performance under load, login/passkey ceremonies, authenticated chat, wallet signing, swaps, paid actions or submissions. No production writes were performed. See the separate browser/unit-test audit for interaction coverage.

Local regression validation: 24 subresource unit tests pass. A temporary local production Express server confirmed missing PNG/SVG/PDF/manifest/sitemap assets return 404, existing manifest/sitemap/robots/icon files return 200, the unknown document route retains its SPA shell, and a simulated `Host: superhero.com` request emits one title and an HTTPS canonical while ignoring spoofed forwarded headers. The temporary server was stopped after verification.

Detailed evidence: [http-production-audit.json](http-production-audit.json) and [http-local-regression.json](http-local-regression.json).
