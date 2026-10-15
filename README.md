# Superhero Web App

Superhero is a modular, React + TypeScript web app for the Aeternity ecosystem that brings together:

- DEX trading and liquidity management
- On-chain governance views and participation
- Trendminer analytics: trending tokens, charts, and real‑time data
- Social posting and tipping with wallet‑based identity

This repository contains the Vite-powered frontend whose runtime configuration lives in `src/config.ts` (with optional Vite env overrides).

## Quick start

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Build for production (outputs to dist/)
npm run build

# Preview the production build locally
npm run preview

# Run unit/component tests
npm test

# Run e2e tests (starts dev server automatically)
npm run test:e2e
```

## What’s inside (feature highlights)

- DEX: swap, add/remove liquidity, token selection, route info, settings
- Governance: proposals, voting views, accounts and activity
- Trendminer: trending lists, mini charts, candles, and live updates via WebSocket
- Social: create posts, tip users, profile and identity components
- Wallet: connect via supported Aeternity wallets, balances, and fiat value helpers

Key modules live under:

- `src/components/dex/*` — DEX UI, hooks, and widgets
- `src/components/explore/*` — token and pair exploration
- `src/components/pool/*` — liquidity management
- `src/components/Trendminer/*` — analytics UI (charts, trending, carousels)
- `src/views/*` — routed pages

## Runtime configuration

Configuration is defined in code at `src/config.ts` via the exported `CONFIG` object. Adjust endpoints and feature flags by editing that file, then rebuild/restart the app. Keys commonly used:

- `BACKEND_URL` — application backend
- `SUPERHERO_API_URL` / `SUPERHERO_WS_URL` — analytics REST and WebSocket endpoints
- `NODE_URL` / `MIDDLEWARE_URL` — Aeternity node and middleware
- `WALLET_URL` — default wallet endpoint
- `GOVERNANCE_API_URL` — governance backend
- `EXPLORER_URL` — block explorer base URL
- `JITSI_DOMAIN` — conferencing domain for meeting links
- `DEX_BACKEND_URL`, `MAINNET_DEX_BACKEND_URL`, `TESTNET_DEX_BACKEND_URL` — DEX services
- `X_OAUTH_CLIENT_ID` — public X OAuth client id used by Connect X flow

You can override some values at build time using Vite env vars:

`VITE_WEBAUTHN_RP_ID` — the WebAuthn RP ID for wallet passkeys, pinned into the
artifact at build time and never derived from the serving host. It defaults to
`superhero.com`, which is correct for production only. Every non-production build
must set it to a registrable domain suffix of its own origin, or passkey
registration fails with a `SecurityError`:

- local dev on `localhost` → `VITE_WEBAUTHN_RP_ID=localhost`
- PR previews on `pr-<N>-superhero.stg.service.aepps.com` → `VITE_WEBAUTHN_RP_ID=stg.service.aepps.com`

A mismatch fails as a `SecurityError` **before the OS shows anything**, so the
symptom is "tapping the passkey option does nothing" rather than a visible
error. Verified working on the `stg.service.aepps.com` previews, which
`.github/workflows/pr_preview.yaml` configures.

The Netlify deploy previews (`deploy-preview-<N>--*.netlify.app`) set no
`VITE_WEBAUTHN_RP_ID`, so they bake in the production default and **cannot do
passkeys** — test passkey flows on the stg preview instead. Wiring them up is
awkward rather than forgotten: `netlify.app` is on the Public Suffix List, so
each preview's only legal RP ID is its own full hostname, which means a
per-deploy value and credentials that don't carry between previews.

```bash
# Example overrides at build/dev time
VITE_SUPERHERO_API_URL=https://api.example.com \
VITE_SUPERHERO_WS_URL=wss://ws.example.com \
VITE_X_OAUTH_CLIENT_ID=your_x_oauth_client_id \
VITE_WEBAUTHN_RP_ID=localhost \
npm run dev

# Or for a production build
VITE_SUPERHERO_API_URL=https://api.example.com \
VITE_SUPERHERO_WS_URL=wss://ws.example.com \
VITE_X_OAUTH_CLIENT_ID=your_x_oauth_client_id \
npm run build
```

## Tech stack

- React 18 + TypeScript, Vite
- State: Redux Toolkit (global app state) and Zustand (local stores where applicable)
- Routing: React Router v6
- Styles: SCSS and Tailwind CSS
- i18n: i18next
- Testing: Vitest + Testing Library (unit/component), Playwright (e2e)

## Scripts

Defined in `package.json`:

- `dev` — run the Vite dev server
- `build` — production build
- `preview` — preview the `dist/` build
- `test` — run unit and component tests
- `test:e2e` — run e2e tests in Docker (same environment as CI; use for consistent screenshots)
- `test:e2e:ui` — run e2e tests in Playwright UI mode (watch, pick tests, debug)
- `test:e2e:update-snapshots` — update screenshot baselines in Docker (writes to `e2e/` on the host)
- `test:e2e:host` — run e2e tests on the host (starts dev server if needed)
- `test:e2e:host:update-snapshots` — update screenshot baselines on the host (visual regression)
- `generate:pwa-icons` — regenerate `public/icons/*.png` from the shared native-app icon master (on demand only, not part of `build`; see the script's header comment for details)
- `verify:pwa-assets` — CI/pre-deploy gate: verifies the manifest + icons are served with the correct `Content-Type` from a running origin, e.g. `npm run verify:pwa-assets -- http://localhost:5174`

## End-to-end tests

E2e tests use [Playwright](https://playwright.dev/) and live in `e2e/`. They run against the Vite dev server (started automatically unless one is already running).

**Screenshot tests (visual regression)** should be run in Docker so CI and local runs produce identical results. Use these commands for anything that uses `toHaveScreenshot`:

```bash
# Run e2e (including screenshot comparison) — same as CI
npm run test:e2e

# Update screenshot baselines after intentional UI changes (writes to e2e/ on your machine)
npm run test:e2e:update-snapshots
```

**Running e2e on the host** (no Docker) is still supported for quick iteration, but screenshot pixels may differ from CI (fonts, OS, DPI). For host runs:

**First-time setup** — install browsers (once per machine):

```bash
npx playwright install chromium
```

**Run all e2e tests on the host:**

```bash
npm run test:e2e:host
```

**Interactive mode** (pick tests, watch, debug):

```bash
npm run test:e2e:ui
```

**Update screenshot baselines on the host:**

```bash
npm run test:e2e:host:update-snapshots
```

Config: `playwright.config.ts`. Failure artifacts are under `test-results/`; the default reporter prints to the terminal.

## Deployment

This app is a static site once built. You can deploy the `dist/` directory to any static host (Netlify, Vercel, S3, nginx, etc.).

- Netlify configuration is included: `netlify.toml` and `public/_redirects` for SPA routing
- Typical build settings: build command `npm run build`, publish directory `dist`

### Container build

The release Dockerfile builds the frontend from source, then runs the SEO server
as the unprivileged `node` user. The runtime contains only the built site, server
code and the dependencies in `server/package-lock.json`. It listens on port 80
by default; set `PORT` when the deployment requires a different container port.

```bash
docker build -t superhero-web:local \
  --build-arg VITE_NETWORK=ae_uat \
  --build-arg VITE_WEBAUTHN_RP_ID=localhost .
docker run --rm --read-only --cap-drop=ALL \
  --security-opt=no-new-privileges \
  -e PORT=8080 -p 127.0.0.1:8080:8080 superhero-web:local
```

For Shorts, also pass `ENABLE_SHORTS=true`, `VITE_SHORTS_API_URL`,
`VITE_SHORTS_STREAM_URL` and the matching `VITE_SHORTS_RELEASE_HASH` as build
arguments. `VITE_SUPERHERO_API_URL` and `VITE_SUPERHERO_WS_URL` select the client
API endpoints. The SEO server uses the **runtime** `SUPERHERO_API_URL`. These are
public configuration values, so never place credentials in them. Shorts remains
disabled unless explicitly enabled at build time.

If a Git dependency requires authentication, provide a least-privilege token
through BuildKit: `--secret id=GITHUB_TOKEN,env=GITHUB_TOKEN`. Existing image CI
already supplies this secret. Do not pass it as a build argument or put it in a
Git URL. The token is used only during dependency installation.

`Dockerfile.dockerignore` restricts the release context to application inputs and
excludes local environment files, dependencies, tests and private keys. Node is
pinned by digest; `docker/web-build-apk.lock` fixes the native build package
versions; both npm dependency trees have lockfiles. Keep both Express locks in
sync when updating the server. A missing locked package must fail the build,
not silently resolve to a newer version. When updating the Node base or Alpine
lock, verify a clean build and retain the signed APK archives and their hashes
with the release artifacts. The image workflow currently targets `linux/amd64`. Allow at least 2 GiB of
RAM for the build worker. Vite defaults to a 1,152 MiB JavaScript heap; a dedicated
CI worker can raise it with `--build-arg BUILD_NODE_OPTIONS=--max-old-space-size=2048`.
This setting affects the build only, not the running server.

## Contributing

1. Create a feature branch from `main`
2. Commit with conventional messages (e.g., `feat:`, `fix:`, `docs:`)
3. Open a pull request

## License

Unless stated otherwise by the project owners, this repository is provided as‑is under its respective license. Consult project maintainers for details.
