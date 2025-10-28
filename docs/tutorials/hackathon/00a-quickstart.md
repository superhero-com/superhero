# 00a — Quickstart (fast track)

!!! important
    Short on time? Follow this 10–15 minute path to get an extension running end‑to‑end.

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

!!! tip
    Ready for more? Explore [Plugin SDK deep dive](./08a-plugin-sdk-deep-dive.md) and [Middleware and data access](./07a-middleware-and-data-access.md).
