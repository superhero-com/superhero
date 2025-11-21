---
title: Quickstart & AI Prompt
---

<Warning>
Short on time? Follow this quick path to get a plugin running end‑to‑end.
</Warning>

<Tip>
Configure Cursor with MCP access to this documentation for the best AI assistance experience. See [Configure Cursor](./configure-cursor) to set up the MCP server connection. This significantly improves AI accuracy and speeds up development.
</Tip>

## AI‑assisted quick start (Cursor or similar)

Use this copy‑paste bootstrap prompt in an AI IDE like [Cursor](https://www.cursor.com) or any editor with an agent. **Make sure you've configured MCP access** (see tip above) for optimal results. The prompt will guide the agent to ask for a short description first, then scaffold both repos and wire the plugin end‑to‑end on æternity testnet.

```text
Goal: Build a complete Superhero plugin (contracts + frontend plugin + optional backend plugin) on æternity testnet with robust Sophia/compiler hygiene and a clean UI integration.

Strict interaction rule
- First, send exactly the question below and STOP. Do not proceed until I reply.
- First message to send:
  "Please describe in 1–2 sentences what you want the Superhero plugin to do (the core action, any write operations, what users see, and whether you need backend processing for the popular feed)."
- After I reply, proceed autonomously with the plan below. If I reply "default", use the Crowdfunding example defined here.

Defaults
- Network: testnet
  - VITE_NODE_URL=https://testnet.aeternity.io
  - COMPILER_URL=https://compiler.aeternity.io
- Names (derived from my description unless I say “default”):
  - CONTRACT_NAME: PascalCase (default Crowdfund)
  - PLUGIN_ID: kebab-case (default crowdfunding)
  - PLUGIN_NAME: Title Case (default Crowdfunding)
  - Contracts repo folder: <PLUGIN_ID>-contracts
  - UI branch: feat/<PLUGIN_ID>
  - Address env: VITE_<CONTRACT_NAME>_CONTRACT
- Secrets live in .env.* only; never print them.

Project structure setup
- Use the workspace setup script from Project Setup guide to create the complete structure:
  - Clone Superhero UI: https://github.com/superhero-com/superhero.git
  - Clone Superhero API: https://github.com/superhero-com/superhero-api.git (if backend plugin needed)
  - Create contracts repo: <PLUGIN_ID>-contracts and initialize git
  - Create workspace file: superhero.code-workspace
- Or follow manual setup steps from Project Setup guide

UI repository
- Repo: https://github.com/superhero-com/superhero.git
- Create branch: feat/<PLUGIN_ID> in the cloned repo

Backend API repository
- Repo: https://github.com/superhero-com/superhero-api.git
- Clone and set up backend repo for transaction processing and popular feed integration
- Implement backend plugins to process blockchain transactions and contribute to the popular feed
- Follow Backend API Setup guide for environment configuration

Sophia contract generation rules (hosted compiler)
- Target https://compiler.aeternity.io.
- Use indentation-sensitive Sophia with spaces only (no tabs). Keep 2 or 4 spaces consistently.
- Inside the contract, define `record state` first. Align closing `}` with the opening keyword column.
- Declare init exactly: `entrypoint init() = { ... }`.
- Do not declare extra record types above the `contract` line. If needed, prefer only `record state` or simple maps in `state`.
- No leading blank line after `contract Name =`, avoid stray blank lines in the header.
- Emit events only after state and init, using:
  - `datatype event = ...`
  - `Chain.event(EventCtor(...))`

Local checks / workarounds
- If `/aci` returns “Unexpected indentation”, sanity-check:
  contract X =
    record state = { n : int }
    entrypoint init() = { n = 0 }
- If ACI endpoint remains strict, deploy via SDK and capture ACI; write:
  - deployments/testnet/<CONTRACT_NAME>.address
  - aci/<CONTRACT_NAME>.json

Plan (after I reply to the initial question)

0) Project setup
- Use workspace setup script or manual steps to create project structure:
  - Clone Superhero UI and API repos
  - Create contracts repo <PLUGIN_ID>-contracts and initialize git
  - Create workspace file superhero.code-workspace
- Open workspace in Cursor/IDE

1) Contracts repo (aeproject)
- Navigate to <PLUGIN_ID>-contracts directory
- Initialize aeproject: `aeproject init`
- Create `contracts/<CONTRACT_NAME>.aes` implementing the requested behavior (default Crowdfunding with create_campaign, contribute, refund, withdraw, get_campaign).
- Emit events for off-chain indexing.
- Add tests (positive + negative).
- Deploy to testnet; write artifacts:
  - deployments/testnet/<CONTRACT_NAME>.address
  - aci/<CONTRACT_NAME>.json
- Conventional commits.

2) Superhero UI plugin
- Navigate to superhero directory
- Create branch: `git checkout -b feat/<PLUGIN_ID>`
- Create `src/plugins/<PLUGIN_ID>/` (+ `contract-artifacts/`).
- Plugin entry using `definePlugin`: composer attachment(s) and item actions as needed by the plugin description.
- Load ACI from `src/plugins/<PLUGIN_ID>/contract-artifacts/<CONTRACT_NAME>.json` (or import from the contracts repo), address from `VITE_<CONTRACT_NAME>_CONTRACT`.
- Register in `src/plugins/local.ts`.
- `.env.local`:
  - VITE_NODE_URL=https://testnet.aeternity.io
  - VITE_COMPILER_URL=https://compiler.aeternity.io
  - VITE_<CONTRACT_NAME>_CONTRACT=<address>
- Conventional commit.

3) Backend API Plugin
- Navigate to superhero-api directory
- Set up environment: copy `.env.example` to `.env` and configure database/Redis
- Create backend plugin for transaction processing:
  - Extend `BasePlugin` in `src/plugins/<PLUGIN_ID>/<PLUGIN_ID>.plugin.ts`
  - Create sync service extending `BasePluginSyncService` to process blockchain transactions
  - Register plugin in `src/app.module.ts`
  - Configure filters to match contract calls
  - Process transactions and extract data
- For popular feed integration, implement `PopularRankingContributor` interface
- See API Plugin Development guide for details.

4) Smoke test
- Run contract tests; start UI; verify reads; perform one write with Superhero Wallet on testnet.
- If backend plugin exists, start API server and verify transaction processing and popular feed contribution.

Output format
- Commands in fenced code blocks
- File diffs for created/edited files
- Conventional commits with short bullet bodies

Collision avoidance
- Before choosing PLUGIN_ID, list `src/plugins/` and avoid existing IDs; if taken, append “-ext”.
- Ensure the contracts repo folder name is unique locally; if needed append “-2”.
```

## 1) Setup Environment

Complete the setup steps (5–10 minutes):
- [Prerequisites](./prerequisites) - Install required software (Node.js, Git, Docker, Cursor)
- [Wallet Setup](./wallet-setup) - Install and configure Superhero Wallet, fund testnet account
- [Configure Cursor](./configure-cursor) - **Important**: Set up MCP access to documentation for better AI assistance
- [Project Setup](./project-setup) - Create your contracts repository and configure workspace
- [Backend API Setup](./backend-setup) - Set up backend API repository (only if building backend plugins)

## 2) Scaffold Project (2–5 minutes)

- Follow: [Project Scaffold](./scaffold-and-compiler)
- Initialize aeproject: `aeproject init`
- Install dependencies, set up `contracts/`, `tests/`, `scripts/`

## 3) Write Your Contract (10–20 minutes)

- Learn Sophia basics: [Smart Contracts](./contracts)
- Use the contract examples and patterns provided
- With AI assistance, describe your contract logic and let Cursor generate the code
- Emit events for off-chain indexing

## 4) Test Locally (5–10 minutes)

- Follow: [Testing & Deployment](./test-and-deploy)
- Compile: `aeproject compile`
- Test: `aeproject test` or write custom Vitest tests
- Verify all entrypoints work correctly

## 5) Deploy to Testnet (2–5 minutes)

- Continue with: [Testing & Deployment](./test-and-deploy)
- Deploy: `aeproject deploy --network testnet`
- Save the contract address and ACI JSON files
- Store in `deployments/testnet/` and `aci/` directories

## 6) Integrate into Superhero (10–15 minutes)

- Follow: [Plugin Integration](./integrate-and-plugin-sdk)
- Create plugin directory: `src/plugins/<your-plugin-id>/`
- Copy contract ACI and address to plugin
- Implement plugin with `definePlugin`
- Register in `src/plugins/local.ts`
- Configure `.env.local` with contract address
- Test the integration

## Next Steps

Once your plugin is running:

- **[Feed Plugins](./feed-plugins)** - Add your plugin's content to the unified feed
- **[API Plugin Development](./api-plugin-development)** - Build backend plugins for transaction processing
- **[Plugin SDK Documentation](../../plugin-sdk)** - Complete API reference for advanced features
- **[Hints & Tips](./hints)** - Troubleshooting and best practices

<Tip>
Having MCP configured makes it much easier to iterate and debug. The AI will have full context of the documentation, making it more helpful for fixing issues and adding features.
</Tip>
