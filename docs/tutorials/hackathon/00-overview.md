# Build Superhero Extensions with Sophia (AI‑assisted)

<Info>
Welcome, hackathon builders! This guide is crafted by Superhero to help you ship a mini‑æpp that integrates directly into the Superhero app (social + DeFi) using Sophia smart contracts and the Plugin SDK.
</Info>

This tutorial is designed for newcomers using Cursor or other AI tools to build Superhero extensions backed by their own Sophia smart contracts.

## What you’ll build
- A small æternity mini‑æpp (extension) that integrates into superhero.com
- A TypeScript test harness that compiles, deploys, and calls your contract
- An extension that calls the contract via the JS SDK and Plugin SDK

## Fast feedback loop
1) Write/refine contract with Cursor → 2) Compile via `aesophia_http` → 3) Test with Vitest + JS SDK → 4) Integrate into a Superhero extension → 5) Deploy to devnet/testnet.

## High‑level architecture
- Contract (Sophia) ↔ ACI ↔ JS SDK (`@aeternity/aepp-sdk`) ↔ Superhero Plugin SDK ↔ Extension UI

<Tip>
You can skim most language details. Focus on state + entrypoints, auth with `Call.caller`, time windows via `Chain`, and gas‑aware design.
</Tip>

## Pages in this tutorial
1. [Quickstart (fast track)](./00a-quickstart.md)
2. [Setup environment](./01-setup-environment.md)
3. [Superhero Wallet & account](./01a-superhero-wallet-and-account.md)
4. [Project scaffold](./02-project-scaffold.md)
5. [Sophia basics for builders (10‑minute skim)](./03-sophia-basics-for-builders.md)
6. [Compiler and build](./04-compiler-and-build.md)
7. [Contract walkthrough: Poll (example)](./05-contract-poll-walkthrough.md)
8. [Testing with Vitest](./06-testing-with-vitest.md)
9. [Deploy: devnet and testnet](./07-deploy-devnet-and-testnet.md)
10. [Middleware and data access](./07a-middleware-and-data-access.md)
11. [Integrate into Superhero extension](./08-integrate-into-superhero-extension.md)
12. [Plugin SDK deep dive](./08a-plugin-sdk-deep-dive.md)
13. [AI workflows in Cursor](./09-ai-workflows-in-cursor.md)
14. [Troubleshooting & FAQ](./10-troubleshooting-and-faq.md)
15. [Security checklist](./11-security-checklist.md)
16. [Reference links & glossary](./12-reference-links-and-glossary.md)
17. [Checklist & deploy extension](./13-checklist-and-deploy-extension.md)

## Official references
- [Docs hub](https://docs.aeternity.com)
- [Syntax](https://github.com/aeternity/aesophia/blob/master/docs/sophia_syntax.md)
- [Features](https://github.com/aeternity/aesophia/blob/master/docs/sophia_features.md)
- [Stdlib](https://github.com/aeternity/aesophia/blob/master/docs/sophia_stdlib.md)
- [Compiler HTTP](https://github.com/aeternity/aesophia_http)
- [JS SDK](https://github.com/aeternity/aepp-sdk-js)
- [Community Q&A](https://forum.aeternity.com/c/sophia-smart-contracts/38)
