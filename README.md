# Yodeck MCP

A [Model Context Protocol](https://modelcontextprotocol.io) server that connects Claude (and any MCP-compatible client) to your [Yodeck](https://yodeck.com) digital signage account.

Control screens, manage content, build schedules, and organise playlists using natural language — no API knowledge required.

> Requires a **Premium or Enterprise** Yodeck account with API access.

---

## What you can do

Ask Claude things like:

- *"Show me all screens in the Waterloo workspace"*
- *"What's currently playing on the reception screen and is the TV on?"*
- *"Add the new product launch video to the San Francisco playlist"*
- *"Create a schedule that shows the all-hands announcement every morning at 9am"*
- *"Search for any media with 'Q4' in the name"*

### Resources covered

| Resource | Operations |
|---|---|
| **Media** | List, get, create (URL-based), update, delete |
| **Playlists** | List, get, create, update, delete, add/remove items |
| **Schedules** | List, get, create, update, delete |
| **Screens** | List, get, create, update, delete, status summary |
| **Workspaces** | List, get, create, update, delete |
| **Layouts** | List, get, create, update, delete |
| **Folders** | List, get, create, update, delete |

### Semantic tools

Beyond raw CRUD, the server includes higher-level tools optimised for natural language use:

| Tool | What it does |
|---|---|
| `yodeck_get_screen_status` | Online/offline, currently playing, CPU temp, RAM, uptime, TV power state, software version |
| `yodeck_assign_content_to_screen` | Set a screen's default content and schedule in one call |
| `yodeck_add_item_to_playlist` | Add a media item at a specific position with a set duration |
| `yodeck_remove_item_from_playlist` | Remove a media item from a playlist by item ID |
| `yodeck_list_screens_by_workspace` | List screens using a workspace name — no ID lookup needed |
| `yodeck_search_media` | Search media by name substring, optionally scoped to a workspace |

---

## Setup

### 1. Get a Yodeck API token

1. Log in to [app.yodeck.com](https://app.yodeck.com)
2. Go to **Account Settings → Advanced Settings → API Tokens**
3. Click **Generate Token**, give it a name, choose a role
4. Copy the token — it won't be shown again

### 2. Clone and build

```bash
git clone https://github.com/TomsFaire/Yodeck-MCP.git
cd Yodeck-MCP
npm install
npm run build
```

### 3. Configure your token

```bash
cp .env.example .env
```

Edit `.env`:

```
YODECK_API_TOKEN=yodeck:your-token-here
```

---

## Using with Claude Desktop

Add the server to your Claude Desktop config file.

**Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "yodeck": {
      "command": "node",
      "args": ["/absolute/path/to/Yodeck-MCP/dist/index.js"],
      "env": {
        "YODECK_API_TOKEN": "yodeck:your-token-here"
      }
    }
  }
}
```

Restart Claude Desktop. You should see the Yodeck tools available in a new conversation.

---

## Using with Cursor

Add the server to your Cursor MCP config at `~/.cursor/mcp.json` (or via **Cursor Settings → MCP**):

```json
{
  "mcpServers": {
    "yodeck": {
      "command": "node",
      "args": ["/absolute/path/to/Yodeck-MCP/dist/index.js"],
      "env": {
        "YODECK_API_TOKEN": "yodeck:your-token-here"
      }
    }
  }
}
```

Once connected, Cursor's AI can call Yodeck tools directly from the editor chat — useful for building automations or integrations that touch your signage content.

---

## Development

### Run in dev mode (no build step)

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Run tests

Tests run against the real Yodeck API — no mocks. Make sure your `.env` has a valid token.

```bash
npm test
```

### Inspect with MCP Inspector

The [MCP Inspector](https://github.com/modelcontextprotocol/inspector) lets you browse and call tools interactively in a web UI:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

Open [http://localhost:5173](http://localhost:5173), connect with your token as an environment variable, and you'll see all tools listed and callable.

---

## Rate limits

Yodeck enforces per-token and per-account request limits in a rolling 10-second window. The server handles 429 responses automatically — it reads the `Retry-After` header and retries once before surfacing an error.

| Level | Token | Account |
|---|---|---|
| Low | 14 req / 10s | 42 req / 10s |
| Standard | 21 req / 10s | 63 req / 10s |
| High | 33 req / 10s | 99 req / 10s |

---

## Project structure

```
src/
├── index.ts          # Server entry point
├── client.ts         # Axios HTTP client with auth and rate-limit handling
├── result.ts         # MCP response helper
├── types.ts          # Shared TypeScript types
└── tools/
    ├── _crud.ts      # Reusable CRUD tool registration
    ├── media.ts
    ├── playlists.ts
    ├── schedules.ts
    ├── screens.ts
    ├── workspaces.ts
    ├── layouts.ts
    ├── folders.ts
    └── semantic.ts   # Composite convenience tools
```
