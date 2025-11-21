---
title: Project Setup
---

You'll work with multiple repositories:

1. **Contracts** (create your own): Sophia code, tests, aeproject, deployments, ACI artifacts.
2. **[Superhero UI](https://github.com/superhero-com/superhero)**: the complete Superhero frontend application where you'll add your frontend plugin.
3. **[Superhero API](https://github.com/superhero-com/superhero-api)** (optional): backend application for transaction processing and popular feed integration.

## Quick Setup (All-in-One)

Run this script to set up everything at once. Replace `<your-plugin-id>` with your plugin identifier (e.g., `crowdfunding`):

```bash
#!/bin/bash
# Superhero Plugin Workspace Setup Script

# Set your plugin ID (replace with your actual plugin name)
PLUGIN_ID="<your-plugin-id>"

# Create project directory
mkdir -p superhero-plugin-workspace && cd superhero-plugin-workspace

# Clone repositories
echo "📦 Cloning repositories..."
git clone https://github.com/superhero-com/superhero.git
git clone https://github.com/superhero-com/superhero-api.git

# Create and initialize contracts repository
echo "📁 Creating contracts repository..."
mkdir -p ${PLUGIN_ID}-contracts && cd ${PLUGIN_ID}-contracts
git init
cd ..

# Create workspace file
echo "⚙️  Creating workspace file..."
cat > superhero.code-workspace << EOF
{
  "folders": [
    {
      "name": "Contracts",
      "path": "./${PLUGIN_ID}-contracts"
    },
    {
      "name": "Superhero UI",
      "path": "./superhero"
    },
    {
      "name": "Superhero API",
      "path": "./superhero-api"
    }
  ],
  "settings": {
    "files.exclude": {
      "**/node_modules": true,
      "**/dist": true,
      "**/.git": false
    },
    "search.exclude": {
      "**/node_modules": true,
      "**/dist": true
    }
  }
}
EOF

echo ""
echo "✅ Setup complete! Project structure:"
echo "  📁 Contracts: ./${PLUGIN_ID}-contracts/"
echo "  📁 UI: ./superhero/"
echo "  📁 API: ./superhero-api/"
echo ""
echo "📝 Next steps:"
echo "  1. Open workspace: cursor superhero.code-workspace"
echo "  2. Initialize contracts: cd ${PLUGIN_ID}-contracts && aeproject init"
echo "  3. Follow the setup guides for UI and API repositories"
```

**To use this script:**

1. Copy the script above
2. Replace `<your-plugin-id>` with your plugin name (e.g., `crowdfunding`)
3. Save as `setup-workspace.sh`
4. Make it executable: `chmod +x setup-workspace.sh`
5. Run: `./setup-workspace.sh`

Or run directly in one line (replace `<your-plugin-id>`):

```bash
PLUGIN_ID="<your-plugin-id>" && mkdir -p superhero-plugin-workspace && cd superhero-plugin-workspace && git clone https://github.com/superhero-com/superhero.git && git clone https://github.com/superhero-com/superhero-api.git && mkdir -p ${PLUGIN_ID}-contracts && cd ${PLUGIN_ID}-contracts && git init && cd .. && cat > superhero.code-workspace << EOF
{
  "folders": [
    {"name": "Contracts", "path": "./${PLUGIN_ID}-contracts"},
    {"name": "Superhero UI", "path": "./superhero"},
    {"name": "Superhero API", "path": "./superhero-api"}
  ],
  "settings": {
    "files.exclude": {"**/node_modules": true, "**/dist": true, "**/.git": false},
    "search.exclude": {"**/node_modules": true, "**/dist": true}
  }
}
EOF
echo "✅ Setup complete! Open with: cursor superhero.code-workspace"
```

## Manual Setup

If you prefer to set up step by step:

### Step 1: Clone Repositories

```bash
# Create project directory
mkdir superhero-plugin-workspace && cd superhero-plugin-workspace

# Clone Superhero UI
git clone https://github.com/superhero-com/superhero.git

# Clone Superhero API (optional, only if building backend plugins)
git clone https://github.com/superhero-com/superhero-api.git
```

### Step 2: Create Contracts Repository

```bash
# Create contracts repository (replace <your-plugin-id> with your plugin name)
PLUGIN_ID="<your-plugin-id>"
mkdir -p ${PLUGIN_ID}-contracts && cd ${PLUGIN_ID}-contracts
git init
cd ..
```

### Step 3: Create Workspace File

Create `superhero.code-workspace` in the root directory:

```json
{
  "folders": [
    {
      "name": "Contracts",
      "path": "./<your-plugin-id>-contracts"
    },
    {
      "name": "Superhero UI",
      "path": "./superhero"
    },
    {
      "name": "Superhero API",
      "path": "./superhero-api"
    }
  ],
  "settings": {
    "files.exclude": {
      "**/node_modules": true,
      "**/dist": true,
      "**/.git": false
    },
    "search.exclude": {
      "**/node_modules": true,
      "**/dist": true
    }
  }
}
```

Replace `<your-plugin-id>` with your actual plugin identifier.

### Step 4: Open Workspace

**Cursor**: `File → Open Workspace from File...` → select `superhero.code-workspace`

**VS Code**: `File → Open Workspace from File...` → select `superhero.code-workspace`

Or from terminal:
```bash
cursor superhero.code-workspace
# or
code superhero.code-workspace
```

## Initialize Contracts Repository

After creating your contracts repository, initialize it with aeproject:

```bash
cd <your-plugin-id>-contracts
aeproject init
```

This will create the basic project structure:
- `contracts/` - Sophia source files (`.aes`)
- `tests/` - TypeScript tests (if using SDK/Vitest)
- `scripts/` - Utility scripts (optional)
- `aeproject.json` - aeproject configuration
- `deployments/` - Contract addresses per network
- `aci/` - Compiled ACIs (JSON)

## Workspace Benefits

- Navigate between repositories easily
- Search across all repos
- Better code completion and IntelliSense
- Single terminal for all repos
- Unified Git operations

<Tip>
Keep your contracts repository separate from the Superhero UI and API repositories. This allows you to version control contracts independently and reuse them across different projects. Use workspace configuration to manage all repos together in your IDE.
</Tip>

