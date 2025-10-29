# Build Superhero Extensions with Sophia (AI‑assisted)

!!! note
    Welcome, hackathon builders! This guide is crafted by Superhero to help you ship a mini‑æpp that integrates directly into the Superhero app (social + DeFi) using Sophia smart contracts and the Plugin SDK.

This tutorial is designed for newcomers using Cursor or other AI tools to build Superhero extensions backed by their own Sophia smart contracts.

## What you'll build
- A small æternity mini‑æpp (extension) that integrates into superhero.com
- A TypeScript test harness that compiles, deploys, and calls your contract
- An extension that calls the contract via the JS SDK and Plugin SDK

## Fast feedback loop
1) Write/refine contract with Cursor → 2) Compile via `aesophia_http` → 3) Test with Vitest + JS SDK → 4) Integrate into a Superhero extension → 5) Deploy to devnet/testnet.

## High‑level architecture
- Contract (Sophia) ↔ ACI ↔ JS SDK (`@aeternity/aepp-sdk`) ↔ Superhero Plugin SDK ↔ Extension UI

!!! tip
    You can skim most language details. Focus on state + entrypoints, auth with `Call.caller`, time windows via `Chain`, and gas‑aware design.

## Pages in this tutorial
1. [Quickstart (fast track)](./tutorials/hackathon/00a-quickstart.md)
2. [Setup environment](./tutorials/hackathon/01-setup-environment.md)
3. [Superhero Wallet & account](./tutorials/hackathon/01a-superhero-wallet-and-account.md)
4. [Project scaffold](./tutorials/hackathon/02-project-scaffold.md)
5. [Sophia basics for builders (10‑minute skim)](./tutorials/hackathon/03-sophia-basics-for-builders.md)
6. [Compiler and build](./tutorials/hackathon/04-compiler-and-build.md)
7. [Contract walkthrough: Poll](./tutorials/hackathon/05-contract-poll-walkthrough.md)
8. [Testing with Vitest](./tutorials/hackathon/06-testing-with-vitest.md)
9. [Deploy: devnet and testnet](./tutorials/hackathon/07-deploy-devnet-and-testnet.md)
10. [Middleware and data access](./tutorials/hackathon/07a-middleware-and-data-access.md)
11. [Integrate into Superhero extension](./tutorials/hackathon/08-integrate-into-superhero-extension.md)
12. [Plugin SDK deep dive](./tutorials/hackathon/08a-plugin-sdk-deep-dive.md)
13. [AI workflows in Cursor](./tutorials/hackathon/09-ai-workflows-in-cursor.md)
14. [Troubleshooting & FAQ](./tutorials/hackathon/10-troubleshooting-and-faq.md)
15. [Security checklist](./tutorials/hackathon/11-security-checklist.md)
16. [Reference links & glossary](./tutorials/hackathon/12-reference-links-and-glossary.md)
17. [Checklist & deploy extension](./tutorials/hackathon/13-checklist-and-deploy-extension.md)

## Official references
- Docs hub: https://docs.aeternity.com
- Syntax: https://github.com/aeternity/aesophia/blob/master/docs/sophia_syntax.md
- Features: https://github.com/aeternity/aesophia/blob/master/docs/sophia_features.md
- Stdlib: https://github.com/aeternity/aesophia/blob/master/docs/sophia_stdlib.md
- Compiler HTTP: https://github.com/aeternity/aesophia_http
- JS SDK: https://github.com/aeternity/aepp-sdk-js
- Community Q&A: https://forum.aeternity.com/c/sophia-smart-contracts/38

