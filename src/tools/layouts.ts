import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { YodeckClient } from '../client.js';
import { registerYodeckCrud } from './_crud.js';

export function registerLayoutTools(server: McpServer, client: YodeckClient): void {
  registerYodeckCrud(server, client, {
    path: 'layouts',
    tools: {
      list: 'yodeck_list_layouts',
      get: 'yodeck_get_layout',
      create: 'yodeck_create_layout',
      update: 'yodeck_update_layout',
      delete: 'yodeck_delete_layout',
    },
  });
}
