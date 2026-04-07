import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { YodeckClient } from '../client.js';
import { registerYodeckCrud } from './_crud.js';

export function registerPlaylistTools(server: McpServer, client: YodeckClient): void {
  registerYodeckCrud(server, client, {
    path: 'playlists',
    tools: {
      list: 'yodeck_list_playlists',
      get: 'yodeck_get_playlist',
      create: 'yodeck_create_playlist',
      update: 'yodeck_update_playlist',
      delete: 'yodeck_delete_playlist',
    },
  });
}
