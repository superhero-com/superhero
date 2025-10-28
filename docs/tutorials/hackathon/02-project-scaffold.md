# 02 — Project scaffold

Initialize a minimal workspace that works well with Cursor and supports compiling, deploying, and testing Sophia contracts.

## Create folders
```bash
mkdir -p contracts tests scripts
```

## Initialize package.json and install deps
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

## Environment profiles
Create two files in the project root (do not commit real keys):

`.env.local` (devnet/local)
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

Switch by exporting variables, or use a small helper script to load one profile before running tests.

## Next steps
- [03 — Sophia basics for builders (skim)](./03-sophia-basics-for-builders.md)
- [04 — Compiler and build](./04-compiler-and-build.md)
