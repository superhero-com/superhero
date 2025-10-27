# Tutorial: Build an NFT Marketplace App Extension

This guide walks you through creating a full-stack extension that adds an `/nft` route and integrates with contracts and an optional backend.

## Prerequisites
- Node 18+, pnpm
- Funded Aeternity testnet account
- Superhero dev env running
- ENV: `VITE_EXT_NFT_API_URL` (optional)

## 1) Scaffold
```bash
pnpm run ext:scaffold nft-marketplace
```

## 2) Register route & menu
See `src/plugins/nft-marketplace/index.tsx`.

## 3) UI stub
Edit `src/plugins/nft-marketplace/ui/MarketApp.tsx` to render listings.

## 4) Contracts
- Write `contracts/Marketplace.aes`
- Compile & export ACI via a script
- Load with `createContractLoader(sdk)`

## 5) Backend integration (optional)
- Add `client/backend.ts` and point to `VITE_EXT_NFT_API_URL`
- Reference backend repo: https://github.com/superhero-com/superhero-api

## 6) Test & commit
- Run app, navigate to `/nft`
- Conventional commits after each step

## Troubleshooting
- Compiler mismatch → update compiler URL
- Missing ACI → recompile contract
