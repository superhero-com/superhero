---
title: Project Setup
---

<Info>
Set up your contracts repository and project structure.
</Info>

<Warning>
Work in two repositories:
1. **Contracts repo** (yours): Sophia code, tests, aeproject, deployments, ACI artifacts.
2. **Superhero UI repo** (this repo): your plugin that consumes the deployed contracts.
</Warning>

## Create Your Contracts Repository

```bash
mkdir my-ae-contracts && cd my-ae-contracts
git init
```

## Project Structure

Recommended directory structure:

```
contracts-repo/
  contracts/              # Sophia source files (`.aes`)
  tests/                  # TypeScript tests (if using SDK/Vitest)
  scripts/                # Utility scripts (optional)
  aeproject.json          # aeproject configuration
  deployments/            # Contract addresses per network
  aci/                    # Compiled ACIs (JSON)
  README.md
```

## Initialize aeproject

If you're using aeproject, initialize your project:

```bash
aeproject init
```

This will create the basic project structure and configuration files.

<Tip>
Keep your contracts repository separate from the Superhero UI repository. This allows you to version control contracts independently and reuse them across different projects.
</Tip>

