---
title: Configure Cursor
---

<Info>
Configure Cursor to access the documentation via Superhero Docs MCP server for better AI assistance.
</Info>

## Superhero Docs MCP Server

This documentation automatically provides a Model Context Protocol (MCP) server. To enable Cursor to access your docs:

### Step 1: Start Mintlify Dev Server (Local Development)

If running documentation locally:

```bash
cd docs
mintlify dev --port 3001
```

### Step 2: Configure Cursor

1. Open **Cursor Settings** → **Tools & Integrations** → **MCP Tools**
2. Click **"Add Custom MCP"** to open the `mcp.json` editor
3. Add the following configuration:

```json
{
  "mcpServers": {
    "superhero-docs": {
      "url": "http://localhost:3001/mcp"
    }
  }
}
```

**Note**: Replace `http://localhost:3001` with your documentation URL (e.g., `https://docs.superhero.com` for production). The MCP endpoint is always at `/mcp` relative to your docs root URL.

4. Save the configuration and restart Cursor

<Tip>
Having the documentation accessible via MCP helps Cursor provide more accurate answers about Superhero plugin development, Sophia contracts, and the Plugin SDK. Make sure the Mintlify dev server is running when using a local URL.
</Tip>

