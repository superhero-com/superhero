# Project Scaffold

## Recommended: aeproject
Initialize a project and run local services with one CLI.

<Tip>
Run all commands in your contracts repo (created in Setup). This repo holds contracts, tests, and aeproject config.
</Tip>

### Init a new project
```bash
mkdir my-aepp && cd my-aepp
aeproject init
```
This creates a standard structure (contracts, deploy/test scaffolds, config).

### Start local node and compiler
```bash
aeproject node  # starts a local devnet in Docker
# (Optional) compiler is started automatically for commands that need it
```

### Compile contracts
```bash
aeproject compile
```

<Tip>
Check `aeproject.json` (or CLI help) for network profiles and paths.
</Tip>

## Optional: manual setup (SDK + Docker compiler)
If you prefer a minimal stack, you can still set up manually:

### Create folders
```bash
mkdir -p contracts tests scripts
```

### Initialize project and install deps
```bash
npm init -y
npm i @aeternity/aepp-sdk dotenv
npm i -D vitest ts-node typescript @types/node
npx tsc --init
```

Add scripts to `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### Environment profiles
`.env.local`
```
NODE_URL=http://localhost:3013
COMPILER_URL=http://localhost:3080
SECRET_KEY=your_local_dev_private_key_hex
```

`.env.testnet`
```
NODE_URL=https://testnet.aeternity.io
COMPILER_URL=http://localhost:3080
SECRET_KEY=your_funded_testnet_private_key_hex
```

### Start the compiler (Docker)
```bash
docker run --rm -p 3080:3080 aeternity/aesophia_http:latest
```

<Tip>
This exposes the compiler at `http://localhost:3080`.
</Tip>

### Pinning versions
Use the compiler pragma in your Sophia source (example):
```
@compiler >= 6.5.0
```
Adjust to a version supported by your `aesophia_http` image.
