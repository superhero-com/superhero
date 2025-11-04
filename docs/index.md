# Build Superhero Extensions with Sophia (AI‑assisted)

!!! note
    Welcome, hackathon builders! This guide is crafted by Superhero to help you ship a mini‑æpp that integrates directly into the Superhero app (social + DeFi) using Sophia smart contracts and the Plugin SDK.

This tutorial is designed for newcomers using Cursor or other AI tools to build Superhero extensions backed by their own Sophia smart contracts.

## What you'll build
- A small æternity mini‑æpp (extension) that integrates into superhero.com
- A TypeScript test harness that compiles, deploys, and calls your contract
- An extension that calls the contract via the JS SDK and Plugin SDK

## Repo model

!!! important
    Work in two repositories:
    1) Contracts repo (yours): Sophia code, tests, aeproject, deployments, ACI artifacts.
    2) Superhero UI repo (this repo): your extension that consumes the deployed contracts.

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

!!! tip
    Prefer the aeproject path for the fastest setup; a minimal “manual path” is provided as an optional alternative.

## Pages in this tutorial
1. [Quickstart](./tutorials/hackathon/00a-quickstart.md)
2. [Setup](./tutorials/hackathon/02-setup.md)
3. [Scaffold and Compiler (aeproject)](./tutorials/hackathon/03-scaffold-and-compiler.md)
4. [Contracts](./tutorials/hackathon/04-contracts.md)
5. [Test and Deploy (aeproject)](./tutorials/hackathon/05-test-and-deploy.md)
6. [Integrate and Plugin SDK](./tutorials/hackathon/06-integrate-and-plugin-sdk.md)
7. [Operations and Support](./tutorials/hackathon/08-ops-and-support.md)

## Official references
- [Docs hub](https://docs.aeternity.com)
- [Syntax](https://github.com/aeternity/aesophia/blob/master/docs/sophia_syntax.md)
- [Features](https://github.com/aeternity/aesophia/blob/master/docs/sophia_features.md)
- [Stdlib](https://github.com/aeternity/aesophia/blob/master/docs/sophia_stdlib.md)
- [Compiler HTTP](https://github.com/aeternity/aesophia_http)
- [JS SDK](https://github.com/aeternity/aepp-sdk-js)
- [Community Q&A](https://forum.aeternity.com/c/sophia-smart-contracts/38)

