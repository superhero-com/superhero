# Setup

!!! note
    You’ll set up your dev environment and Superhero Wallet to create and test contracts.

## Install prerequisites
- Node.js LTS (e.g., 20.x)
- Git
- Docker
- Cursor (or VS Code)

## Install aeproject (recommended)
```bash
npm i -g @aeternity/aeproject@latest
# quick check
aeproject --version
```

## Create an æternity account
- Generate a dev key locally for development tests
- For testnet, use a funded key (get AE from the faucet via docs hub)
- Never commit private keys; use `.env*` files locally only

## Install Superhero Wallet
- Chrome: [Superhero Wallet extension](https://chromewebstore.google.com/detail/superhero-wallet/mnhmmkepfddpifjkamaligfeemcbhdne)

!!! tip
    Pin the extension for quick access.

## Create or import an account in Wallet
- Choose “Create” to generate a new seed phrase, or “Import” to restore an existing one
- Write down the seed phrase offline; never share it

!!! important
    Back up your seed phrase. Anyone with your seed can control your account.

## Switch to testnet and fund
- In settings, select æternity testnet
- Use the testnet faucet to fund your account (see the References page)

## Project directories
- `contracts/` — Sophia source files (`.aes`)
- `tests/` — TypeScript tests (if you use the SDK/ Vitest path)
- `scripts/` — utility scripts (optional)

## Verify tools
```bash
node -v
npm -v
docker --version
aeproject --version
```
