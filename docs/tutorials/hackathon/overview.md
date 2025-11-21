---
title: Overview
---

<Info>
Welcome, hackathon builders! This guide helps you build a Superhero plugin that integrates directly into the Superhero app (social + DeFi) using Sophia smart contracts and the Plugin SDK.
</Info>

This tutorial is designed for newcomers using Cursor or other AI tools to build Superhero plugins backed by their own Sophia smart contracts.

## What you'll build
- A Superhero plugin that integrates into superhero.com
- A TypeScript test harness that compiles, deploys, and calls your contract
- A plugin that calls the contract via the JS SDK and Plugin SDK

## Fast feedback loop
1) Write/refine contract with Cursor → 2) Compile via `aeproject` → 3) Test with Vitest + JS SDK → 4) Integrate into a Superhero plugin → 5) Deploy to devnet/testnet.

## High‑level architecture
- Contract (Sophia) ↔ ACI ↔ JS SDK (`@aeternity/aepp-sdk`) ↔ Superhero Plugin SDK ↔ Plugin UI

<Tip>
You can skim most language details. Focus on state + entrypoints, auth with `Call.caller`, time windows via `Chain`, and gas‑aware design.
</Tip>

## Getting Started

- **[Quickstart](./quickstart)** - Fast track to get a plugin running
- **[Setup Overview](./setup)** - Complete setup instructions

## Contract Development

- **[Project Scaffold](./scaffold-and-compiler)** - Set up your project with aeproject
- **[Smart Contracts](./contracts)** - Learn Sophia contract development
- **[Testing & Deployment](./test-and-deploy)** - Test and deploy your contracts

## Plugin Development

- **[Plugin Integration](./integrate-and-plugin-sdk)** - Integrate your contract into Superhero
- **[Feed Plugins](./feed-plugins)** - Add content to the unified feed
- **[API Plugin Development](./api-plugin-development)** - Build backend plugins

## Resources

- **[Hints & Tips](./hints)** - Development tips and troubleshooting
- **[References](./references)** - Links to documentation and tools
- **[Plugin SDK Documentation](../../plugin-sdk)** - Complete Plugin SDK reference
