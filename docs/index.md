---
title: Overview
---

# Build Superhero Extensions with Sophia (AI‑assisted)

<Info>
Welcome, hackathon builders! This guide is crafted by Superhero to help you ship a mini‑æpp that integrates directly into the Superhero app (social + DeFi) using Sophia smart contracts and the Plugin SDK.
</Info>

This tutorial is designed for newcomers using Cursor or other AI tools to build Superhero extensions backed by their own Sophia smart contracts.

## What you'll build
- A small æternity mini‑æpp (extension) that integrates into superhero.com
- A TypeScript test harness that compiles, deploys, and calls your contract
- An extension that calls the contract via the JS SDK and Plugin SDK

## Repo model

<Warning>
Work in two repositories:
1) Contracts repo (yours): Sophia code, tests, aeproject, deployments, ACI artifacts.
2) Superhero UI repo (this repo): your extension that consumes the deployed contracts.
</Warning>

Recommended structure:
```
contracts-repo/
  contracts/
  tests/
  aeproject.json
  deployments/             # addresses per network
  aci/                     # compiled ACIs (JSON)
  README.md

superhero-ui-repo/         # this repo
  src/extensions/your-plugin/
  ... (imports contract address + ACI from your contracts repo)
```

## Fast feedback loop
1) Write/refine contract with Cursor → 2) Compile via `aeproject compile` → 3) Test with `aeproject test` → 4) Integrate into a Superhero extension → 5) `aeproject deploy` to devnet/testnet.

## High‑level architecture
- Contract (Sophia) ↔ ACI ↔ JS SDK (`@aeternity/aepp-sdk`) ↔ Superhero Plugin SDK ↔ Extension UI

<Tip>
Prefer the aeproject path for the fastest setup; a minimal "manual path" is provided as an optional alternative.
</Tip>

