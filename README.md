# Superhero Web App

Superhero is a modular, React + TypeScript web app for the Aeternity ecosystem that brings together:

- DEX trading and liquidity management
- On-chain governance views and participation
- Trendminer analytics: trending tokens, charts, and real‑time data
- Social posting and tipping with wallet‑based identity

This repository contains the Vite-powered frontend that loads its runtime configuration from `public/superconfig.json`.

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

# Run tests
npm test
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

At runtime, the app loads `public/superconfig.json`. Adjust endpoints and feature flags without rebuilding. Keys commonly used:

- `BACKEND_URL` — application backend
- `TRENDMINER_API_URL` / `TRENDMINER_WS_URL` — analytics REST and WebSocket endpoints
- `NODE_URL` / `MIDDLEWARE_URL` — Aeternity node and middleware
- `WALLET_URL` — default wallet endpoint
- `GOVERNANCE_API_URL` — governance backend
- `EXPLORER_URL` — block explorer base URL
- `JITSI_DOMAIN` — conferencing domain for meeting links
- `IMGUR_API_CLIENT_ID`, `GIPHY_API_KEY` — optional media integrations
- `DEX_BACKEND_URL`, `MAINNET_DEX_BACKEND_URL`, `TESTNET_DEX_BACKEND_URL` — DEX services

Edit `public/superconfig.json` and refresh the app to apply changes.

## Tech stack

- React 18 + TypeScript, Vite
- State: Redux Toolkit (global app state) and Zustand (local stores where applicable)
- Routing: React Router v6
- Styles: SCSS and Tailwind CSS
- i18n: i18next
- Testing: Vitest + Testing Library

## Scripts

Defined in `package.json`:

- `dev` — run the Vite dev server
- `build` — production build
- `preview` — preview the `dist/` build
- `test` — run unit and component tests

## Deployment

This app is a static site once built. You can deploy the `dist/` directory to any static host (Netlify, Vercel, S3, nginx, etc.).

- Netlify configuration is included: `netlify.toml` and `public/_redirects` for SPA routing
- Typical build settings: build command `npm run build`, publish directory `dist`

## Contributing

1. Create a feature branch from `main`
2. Commit with conventional messages (e.g., `feat:`, `fix:`, `docs:`)
3. Open a pull request

## License

Unless stated otherwise by the project owners, this repository is provided as‑is under its respective license. Consult project maintainers for details.
