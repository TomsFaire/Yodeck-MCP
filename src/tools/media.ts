import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { YodeckClient } from '../client.js';
import { registerYodeckCrud } from './_crud.js';

export function registerMediaTools(server: McpServer, client: YodeckClient): void {
  registerYodeckCrud(server, client, {
    path: 'media',
    tools: {
      list: 'yodeck_list_media',
      get: 'yodeck_get_media',
      create: 'yodeck_create_media',
      update: 'yodeck_update_media',
      delete: 'yodeck_delete_media',
    },
  });
}
