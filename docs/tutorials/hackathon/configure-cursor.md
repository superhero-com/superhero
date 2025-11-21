---
title: Configure Cursor
---

<Tip>
Configure Cursor with MCP to access this documentation for better AI assistance. All pages are in Markdown—add `.md` to any URL to get the raw source (e.g., `/quickstart` → `/quickstart.md`).
</Tip>

## Connect to MCP Server for Superhero Documentation

This documentation automatically provides a Model Context Protocol (MCP) server. Configure Cursor to access it:

### Step 1: Open Cursor Settings

1. Open **Cursor Settings** → **Tools & Integrations** → **MCP Tools**
2. Click **"Add Custom MCP"** to open the `mcp.json` editor

### Step 2: Add MCP Configuration

Add the following configuration to your `mcp.json`:

```json
{
  "mcpServers": {
    "superhero-docs": {
      "url": "https://docs.superhero.com/mcp"
    }
  }
}
```

### Step 3: Save and Restart

1. Save the configuration file
2. Restart Cursor to apply the changes

## Alternative: Run Documentation Locally

If you prefer to run the documentation locally (useful for development or offline access):

1. Start the Mintlify dev server:

```bash
cd docs
mintlify dev --port 3002
```

2. Update your MCP configuration to use the local URL:

```json
{
  "mcpServers": {
    "superhero-docs": {
      "url": "http://localhost:3002/mcp"
    }
  }
}
```

<Tip>
Make sure the Mintlify dev server is running when using a local URL. The server must be active for Cursor to access the documentation via MCP.
</Tip>

