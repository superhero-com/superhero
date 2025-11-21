---
title: Build Superhero Plugins
---

<Info>
Welcome, hackathon builders! This guide is crafted by Superhero to help you ship a mini‑æpp that integrates directly into the Superhero app (social + DeFi) using Sophia smart contracts and the Plugin SDK.
</Info>

This tutorial is designed for newcomers using Cursor or other AI tools to build Superhero plugins backed by their own Sophia smart contracts.

## What you'll build
- A small æternity mini‑æpp (plugin) that integrates into superhero.com
- A TypeScript test harness that compiles, deploys, and calls your contract
- A plugin that calls the contract via the JS SDK and Plugin SDK

## Repo model

<Warning>
Work in two repositories:
1) Contracts repo (yours): Sophia code, tests, aeproject, deployments, ACI artifacts.
2) Superhero UI repo (this repo): your plugin that consumes the deployed contracts.
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
  src/plugins/your-plugin/
  ... (imports contract address + ACI from your contracts repo)
```

## Fast Feedback Loop
1) Write/refine contract with Cursor → 2) Compile via `aeproject compile` → 3) Test with `aeproject test` → 4) Integrate into a Superhero plugin → 5) `aeproject deploy` to devnet/testnet.

## High‑Level Architecture
- Contract (Sophia) ↔ ACI ↔ JS SDK (`@aeternity/aepp-sdk`) ↔ Superhero Plugin SDK ↔ Plugin UI

<Tip>
Prefer the aeproject path for the fastest setup. See [Project Scaffold](./tutorials/hackathon/scaffold-and-compiler.md) for details.
</Tip>

## Quick Links

- **[Quickstart](./tutorials/hackathon/quickstart.md)** - Get started in 10-15 minutes
- **[Setup](./tutorials/hackathon/setup.md)** - Complete environment setup
- **[Plugin SDK Documentation](./plugin-sdk.md)** - Complete API reference
- **[References](./tutorials/hackathon/references.md)** - Documentation links and tools

