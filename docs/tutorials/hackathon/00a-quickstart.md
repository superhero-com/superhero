# Quickstart (Fast Track)

<Warning>
Short on time? Follow this 10–15 minute path to get an extension running end‑to‑end.
</Warning>

## AI‑assisted quick start (Cursor or similar)

Use this copy‑paste bootstrap prompt in an AI IDE like [Cursor](https://www.cursor.com) or any editor with an agent. It will guide the agent to ask for a short description first, then scaffold both repos and wire the plugin end‑to‑end on æternity testnet.

```text
Goal: Build a Superhero extension (contracts + Superhero plugin) on æternity testnet with robust Sophia/compiler hygiene and a clean UI integration.

Strict interaction rule
- First, send exactly the question below and STOP. Do not proceed until I reply.
- First message to send:
  “Please describe in 1–2 sentences what you want the Superhero extension to do (the core action, any write operations, and what users see).”
- After I reply, proceed autonomously with the plan below. If I reply “default”, use the Crowdfunding example defined here.

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

UI upstream for testing
- Repo: https://github.com/superhero-com/superhero.git
- Branch: feat/hackathon-tutorial
- Clone:
  git clone --branch feat/hackathon-tutorial --single-branch https://github.com/superhero-com/superhero.git ui
  cd ui
  git checkout -b feat/<PLUGIN_ID>

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

1) Contracts repo (aeproject)
- Initialize repo <PLUGIN_ID>-contracts and aeproject.
- Create `contracts/<CONTRACT_NAME>.aes` implementing the requested behavior (default Crowdfunding with create_campaign, contribute, refund, withdraw, get_campaign).
- Emit events for off-chain indexing.
- Add tests (positive + negative).
- Deploy to testnet; write artifacts:
  - deployments/testnet/<CONTRACT_NAME>.address
  - aci/<CONTRACT_NAME>.json
- Conventional commits.

2) Superhero UI (fork/clone as above)
- Create `src/plugins/<PLUGIN_ID>/` (+ `contract-artifacts/`).
- Plugin entry using `definePlugin`: composer attachment(s) and item actions as needed by the extension description.
- Load ACI from `src/plugins/<PLUGIN_ID>/contract-artifacts/<CONTRACT_NAME>.json` (or import from the contracts repo), address from `VITE_<CONTRACT_NAME>_CONTRACT`.
- Register in `src/plugins/local.ts`.
- `.env.local`:
  - VITE_NODE_URL=https://testnet.aeternity.io
  - VITE_COMPILER_URL=https://compiler.aeternity.io
  - VITE_<CONTRACT_NAME>_CONTRACT=<address>
- Conventional commit.

3) Smoke test
- Run tests; start UI; verify reads; perform one write with Superhero Wallet on testnet.

Output format
- Commands in fenced code blocks
- File diffs for created/edited files
- Conventional commits with short bullet bodies

Collision avoidance
- Before choosing PLUGIN_ID, list `src/plugins/` and avoid existing IDs; if taken, append “-ext”.
- Ensure the contracts repo folder name is unique locally; if needed append “-2”.
```

## 1) Install Superhero Wallet
- Add the Chrome extension and create/import an æternity account.
- Back up the seed phrase.

## 2) Scaffold project
- Follow: [02 — Project scaffold](./02-project-scaffold.md)
- Install deps, set up `contracts/`, `tests/`, `scripts/`.

## 3) Start the compiler
```bash
docker run --rm -p 3080:3080 aeternity/aesophia_http:latest
```

## 4) Write minimal contract
- Use [05 — Contract walkthrough: Poll](./05-contract-poll-walkthrough.md) as a template.

## 5) Test locally
- Follow: [06 — Testing with Vitest](./06-testing-with-vitest.md)
- Compile, deploy, and call methods in tests.

## 6) Deploy to testnet
- Follow: [07 — Deploy: devnet and testnet](./07-deploy-devnet-and-testnet.md)

## 7) Integrate into Superhero
- Follow: [08 — Integrate into Superhero extension](./08-integrate-into-superhero-extension.md)

<Tip>
Ready for more? Explore [Plugin SDK deep dive](./08a-plugin-sdk-deep-dive.md) and [Middleware and data access](./07a-middleware-and-data-access.md).
</Tip>
