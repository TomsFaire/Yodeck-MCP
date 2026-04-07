# Yodeck MCP Server — Design Spec

**Date:** 2026-04-07  
**Status:** Approved  
**Phase:** 1 (MCP server only; companion integration is Phase 2)

---

## Overview

A Model Context Protocol (MCP) server that exposes the Yodeck digital signage API as tools for Claude. Enables natural language control of screens, media, playlists, schedules, layouts, workspaces, and folders. Initial use is personal (single token), with team rollout planned.

---

## Architecture

### Runtime
- **Language:** TypeScript (Node.js)
- **MCP SDK:** `@modelcontextprotocol/sdk`
- **HTTP client:** `axios`
- **Transport:** stdio (standard for Claude Desktop local use)
- **Auth:** `YODECK_API_TOKEN` environment variable — server exits with a clear error on startup if missing
- **API base URL:** `https://app.yodeck.com/api/v2/`
- **Auth header:** `Authorization: Token <YODECK_API_TOKEN>`

### Project Structure
```
yodeck-mcp/
├── src/
│   ├── index.ts              # MCP server entry point, tool registration
│   ├── client.ts             # Axios instance with auth header and base URL
│   ├── tools/
│   │   ├── media.ts          # CRUD tools for media
│   │   ├── playlists.ts      # CRUD tools for playlists
│   │   ├── schedules.ts      # CRUD tools for schedules
│   │   ├── screens.ts        # CRUD tools for screens
│   │   ├── workspaces.ts     # CRUD tools for workspaces
│   │   ├── layouts.ts        # CRUD tools for layouts
│   │   ├── folders.ts        # CRUD tools for folders
│   │   └── semantic.ts       # Composite convenience tools
│   └── types.ts              # Shared TypeScript types for API responses
├── tests/
│   ├── media.test.ts
│   ├── playlists.test.ts
│   ├── schedules.test.ts
│   ├── screens.test.ts
│   ├── workspaces.test.ts
│   ├── layouts.test.ts
│   ├── folders.test.ts
│   └── semantic.test.ts
├── .env                      # YODECK_API_TOKEN (not committed)
├── package.json
└── tsconfig.json
```

Each tool file exports an array of tool definitions. `index.ts` collects and registers them all with the MCP server.

---

## API Resources

Confirmed available endpoints (all support full CRUD via GET/POST/PATCH/DELETE):

| Resource | Endpoint | Notable Fields |
|---|---|---|
| Media | `/api/v2/media/` | name, status, workspace, parent_folder, tags, arguments, media_origin, availability_schedule, default_duration, thumbnail_url |
| Playlists | `/api/v2/playlists/` | name, type, items, workspace, transition_options, playback_options |
| Schedules | `/api/v2/schedules/` | name, events (start/end/recurrence/days_of_week/priority), workspace, filler_content |
| Screens | `/api/v2/screens/` | name, content (default + schedule), player_status (CPU, RAM, uptime, IP, TV, resolution), workspace, tags |
| Workspaces | `/api/v2/workspaces/` | name, description, working_hours, parent_workspace, device_quota |
| Layouts | `/api/v2/layouts/` | name, regions (multi-zone with dimensions/position/content), workspace, parent_folder |
| Folders | `/api/v2/folders/` | name, folder_type, workspace, parent_folder |

---

## Tools

### CRUD Tools (~37 total)

Standard pattern per resource: `yodeck_{verb}_{resource}`

**Media**
- `yodeck_list_media` — list with optional limit/offset/workspace filter
- `yodeck_get_media` — get single media item by ID
- `yodeck_create_media` — create media item (URL-based; file upload is Phase 2)
- `yodeck_update_media` — update media fields
- `yodeck_delete_media` — delete media item

**Playlists**
- `yodeck_list_playlists`
- `yodeck_get_playlist`
- `yodeck_create_playlist`
- `yodeck_update_playlist`
- `yodeck_delete_playlist`

**Schedules**
- `yodeck_list_schedules`
- `yodeck_get_schedule`
- `yodeck_create_schedule`
- `yodeck_update_schedule`
- `yodeck_delete_schedule`

**Screens**
- `yodeck_list_screens`
- `yodeck_get_screen`
- `yodeck_create_screen`
- `yodeck_update_screen`
- `yodeck_delete_screen`

**Workspaces**
- `yodeck_list_workspaces`
- `yodeck_get_workspace`
- `yodeck_create_workspace`
- `yodeck_update_workspace`
- `yodeck_delete_workspace`

**Layouts**
- `yodeck_list_layouts`
- `yodeck_get_layout`
- `yodeck_create_layout`
- `yodeck_update_layout`
- `yodeck_delete_layout`

**Folders**
- `yodeck_list_folders`
- `yodeck_get_folder`
- `yodeck_create_folder`
- `yodeck_update_folder`
- `yodeck_delete_folder`

### Semantic Tools (~6)

| Tool | Purpose |
|---|---|
| `yodeck_get_screen_status` | Returns a clean summary for a screen: online/offline, currently playing content, CPU temp, RAM usage, uptime, TV power state, software version |
| `yodeck_assign_content_to_screen` | Sets a screen's default content (playlist, media, or layout by ID) and optionally assigns a schedule — single call instead of two |
| `yodeck_add_item_to_playlist` | Adds a media item to a playlist at a given position with specified duration |
| `yodeck_remove_item_from_playlist` | Removes a media item from a playlist by item ID |
| `yodeck_list_screens_by_workspace` | Returns all screens in a named workspace — no ID lookup required |
| `yodeck_search_media` | Searches media by name substring, optionally filtered by workspace name |

---

## Data Flow

### Pagination
All list endpoints return `{ count, next, previous, results }`. List tools accept optional `limit` (default 100) and `offset`. The full pagination envelope is returned so Claude can request subsequent pages if needed.

### Response Shaping
Raw API JSON is returned as-is for all CRUD tools — no summarisation. Claude receives the full object. Exception: `yodeck_get_screen_status` assembles a clean summary from the nested `player_status` field.

### Error Handling
API errors are caught and returned as readable MCP error responses. Format:
```
Yodeck API error 404: Media item 99999 not found
Yodeck API error 403: Insufficient permissions for this workspace
```
Raw stack traces are never surfaced to Claude.

---

## Rate Limiting

Yodeck applies per-token and per-account limits in a rolling 10s window across three levels:

| Level | Token limit | Account limit |
|---|---|---|
| Low | 14 req/10s | 42 req/10s |
| Standard | 21 req/10s | 63 req/10s |
| High | 33 req/10s | 99 req/10s |

Each endpoint has its own level. On a 429 response:
1. Read the `Retry-After: N` header
2. Wait exactly N seconds
3. Retry once

If the retry also returns 429, surface a clear error:
```
Yodeck rate limit hit again after retry. Please wait before retrying.
```

---

## Testing

**Runner:** Vitest  
**Approach:** Integration tests against the real Yodeck API. No mocks.  
**Config:** `YODECK_API_TOKEN` loaded from `.env` via `dotenv`

### Per-Resource Pattern
Each test file runs a full CRUD cycle: create → read → update → verify → delete. Tests clean up after themselves.

### Exceptions
- **Screens** and **Workspaces**: No create/delete in tests (avoid polluting the account). Tests cover list, get, and update only against existing resources.
- **Semantic tools**: Tested against real data using known resource names (e.g. searching for a known media item, fetching status of a known screen).

---

## Out of Scope (Phase 1)

- Users, groups, roles, tokens endpoints (return 403 with this token role)
- File upload for media (URL-based creation only in Phase 1)
- Webhook management
- The companion integration (Phase 2)
