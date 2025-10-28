# 01 — Setup environment

This page gets you ready to build and test Sophia contracts and Superhero extensions with Cursor.

## Install prerequisites
- Node.js LTS (e.g., 20.x)
- Git
- Docker
- Cursor (or VS Code)

## Create an æternity account
You need a private key for local/devnet and a funded key for testnet.

- Generate a dev key locally for development tests.
- Obtain testnet funds for a test key via the official faucet (see docs hub for current link).

Never commit private keys. Use `.env*` files locally only.

## Project directories
We will use the following folders in later pages:
- `contracts/` — Sophia source files (`.aes`)
- `tests/` — TypeScript tests
- `scripts/` — utility scripts (optional)

## Recommended global checks
```bash
node -v
npm -v
docker --version
```

If Docker is installed, you’ll be able to run the Sophia HTTP compiler locally in the next steps.

## What’s next
- Move to [02 — Project scaffold](./02-project-scaffold.md) to initialize a workspace, add dependencies, and create `.env` profiles for devnet and testnet.
