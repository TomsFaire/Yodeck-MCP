import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { YodeckClient } from '../client.js';
import type { Paginated } from '../types.js';
import { toolJsonResult } from '../result.js';

function asRecord(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === 'object' ? (v as Record<string, unknown>) : {};
}

/** Shape returned by yodeck_get_screen_status (best-effort mapping from player_status). */
export function summarizeScreenStatus(screen: unknown): Record<string, unknown> {
  const s = asRecord(screen);
  const ps = asRecord(s.player_status);
  const content = asRecord(s.content);

  const firstString = (...keys: string[]): string | null => {
    for (const k of keys) {
      const v = ps[k] ?? content[k] ?? s[k];
      if (typeof v === 'string' && v.length) return v;
    }
    return null;
  };

  const firstNumber = (...keys: string[]): number | null => {
    for (const k of keys) {
      const v = ps[k];
      if (typeof v === 'number' && Number.isFinite(v)) return v;
    }
    return null;
  };

  const online =
    typeof ps.is_online === 'boolean'
      ? ps.is_online
      : typeof ps.online === 'boolean'
        ? ps.online
        : typeof ps.connected === 'boolean'
          ? ps.connected
          : null;

  return {
    screen_id: s.id ?? null,
    name: typeof s.name === 'string' ? s.name : null,
    online,
    currently_playing:
      content.current ??
      content.now_playing ??
      ps.current_media ??
      ps.playing ??
      null,
    cpu_temperature_c: firstNumber('cpu_temperature', 'cpu_temp', 'temperature'),
    ram_usage_percent: firstNumber('memory_usage_percent', 'ram_percent', 'ram_usage'),
    uptime_seconds: firstNumber('uptime', 'uptime_seconds'),
    tv_power: ps.tv_power ?? ps.tv_on ?? ps.tv_status ?? null,
    software_version: firstString('version', 'player_version', 'software_version'),
    player_status: ps,
  };
}

export async function listScreensByWorkspaceName(
  client: YodeckClient,
  workspaceName: string,
  listParams: { limit?: number; offset?: number },
): Promise<unknown> {
  const wsList = (await client.list('workspaces', { limit: 500 })) as Paginated;
  const results = Array.isArray(wsList.results) ? wsList.results : [];
  const match = results.find(
    (w) => asRecord(w).name === workspaceName || asRecord(w).title === workspaceName,
  );
  if (!match) {
    throw new Error(`Yodeck API error 404: Workspace "${workspaceName}" not found`);
  }
  const id = asRecord(match).id;
  if (typeof id !== 'number' && typeof id !== 'string') {
    throw new Error('Workspace record had no id');
  }
  return client.list('screens', {
    workspace: typeof id === 'number' ? id : Number(id),
    limit: listParams.limit,
    offset: listParams.offset,
  });
}

export async function searchMediaByName(
  client: YodeckClient,
  nameQuery: string,
  options: { workspaceName?: string; limit?: number },
): Promise<unknown> {
  let workspaceId: number | undefined;
  if (options.workspaceName) {
    const wsList = (await client.list('workspaces', { limit: 500 })) as Paginated;
    const results = Array.isArray(wsList.results) ? wsList.results : [];
    const match = results.find((w) => asRecord(w).name === options.workspaceName);
    if (!match) {
      throw new Error(`Yodeck API error 404: Workspace "${options.workspaceName}" not found`);
    }
    const id = asRecord(match).id;
    workspaceId = typeof id === 'number' ? id : Number(id);
  }

  const cap = Math.min(options.limit ?? 200, 500);
  const raw = (await client.list('media', { limit: cap, workspace: workspaceId })) as Paginated;
  const items = Array.isArray(raw.results) ? raw.results : [];
  const q = nameQuery.toLowerCase();
  const filtered = items.filter((m) => {
    const name = asRecord(m).name;
    return typeof name === 'string' && name.toLowerCase().includes(q);
  });

  return {
    count: filtered.length,
    results: filtered,
    source_page: { count: raw.count, next: raw.next, previous: raw.previous },
    note: 'Name filter applied to the fetched page(s) only; use a higher limit or paginate if needed.',
  };
}

export function registerSemanticTools(server: McpServer, client: YodeckClient): void {
  server.registerTool(
    'yodeck_get_screen_status',
    {
      description:
        'Returns a concise summary for a screen: online/offline, playing content, CPU temp, RAM, uptime, TV power, software version (from player_status).',
      inputSchema: {
        id: z.union([z.number().int(), z.string()]).describe('Screen ID'),
      },
    },
    async (args) => {
      const screen = await client.get('screens', args.id);
      return toolJsonResult(summarizeScreenStatus(screen));
    },
  );

  server.registerTool(
    'yodeck_assign_content_to_screen',
    {
      description:
        "PATCH a screen with default content and optional schedule in one call. Pass `content` as the API expects (e.g. default content fields); set schedule_id to assign a schedule.",
      inputSchema: {
        screen_id: z.union([z.number().int(), z.string()]),
        content: z.record(z.string(), z.unknown()).describe('Fields merged into the PATCH body'),
        schedule_id: z.union([z.number().int(), z.string()]).optional(),
      },
    },
    async (args) => {
      const body: Record<string, unknown> = { ...args.content };
      if (args.schedule_id !== undefined) body.schedule = args.schedule_id;
      const data = await client.patch('screens', args.screen_id, body);
      return toolJsonResult(data);
    },
  );

  server.registerTool(
    'yodeck_add_item_to_playlist',
    {
      description:
        'Fetch a playlist, insert a media item at the given position with duration, and PATCH items back.',
      inputSchema: {
        playlist_id: z.union([z.number().int(), z.string()]),
        media_id: z.union([z.number().int(), z.string()]),
        position: z.number().int().min(0).describe('0-based index in the items array'),
        duration_seconds: z.number().int().positive(),
      },
    },
    async (args) => {
      const pl = asRecord(await client.get('playlists', args.playlist_id));
      const items = Array.isArray(pl.items) ? [...pl.items] : [];
      const newItem: Record<string, unknown> = {
        media: args.media_id,
        duration: args.duration_seconds,
      };
      items.splice(args.position, 0, newItem);
      const data = await client.patch('playlists', args.playlist_id, { items });
      return toolJsonResult(data);
    },
  );

  server.registerTool(
    'yodeck_remove_item_from_playlist',
    {
      description: 'Remove a playlist row by its item id (the id on the playlist item object).',
      inputSchema: {
        playlist_id: z.union([z.number().int(), z.string()]),
        item_id: z.union([z.number().int(), z.string()]),
      },
    },
    async (args) => {
      const pl = asRecord(await client.get('playlists', args.playlist_id));
      const items = Array.isArray(pl.items) ? pl.items : [];
      const idStr = String(args.item_id);
      const filtered = items.filter((it) => {
        const r = asRecord(it);
        return String(r.id ?? r.pk ?? '') !== idStr;
      });
      const data = await client.patch('playlists', args.playlist_id, { items: filtered });
      return toolJsonResult(data);
    },
  );

  server.registerTool(
    'yodeck_list_screens_by_workspace',
    {
      description: 'List all screens in a workspace identified by exact workspace name (no workspace ID needed).',
      inputSchema: {
        workspace_name: z.string().min(1),
        limit: z.number().int().positive().max(500).optional(),
        offset: z.number().int().min(0).optional(),
      },
    },
    async (args) => {
      const data = await listScreensByWorkspaceName(client, args.workspace_name, {
        limit: args.limit,
        offset: args.offset,
      });
      return toolJsonResult(data);
    },
  );

  server.registerTool(
    'yodeck_search_media',
    {
      description: 'Search media whose name contains the given substring (case-insensitive), optionally scoped by workspace name.',
      inputSchema: {
        name_query: z.string().min(1),
        workspace_name: z.string().optional(),
        limit: z.number().int().positive().max(500).optional(),
      },
    },
    async (args) => {
      const data = await searchMediaByName(client, args.name_query, {
        workspaceName: args.workspace_name,
        limit: args.limit,
      });
      return toolJsonResult(data);
    },
  );
}
