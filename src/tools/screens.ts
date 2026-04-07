import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { YodeckClient } from '../client.js';
import { registerYodeckCrud } from './_crud.js';

export function registerScreenTools(server: McpServer, client: YodeckClient): void {
  registerYodeckCrud(server, client, {
    path: 'screens',
    tools: {
      list: 'yodeck_list_screens',
      get: 'yodeck_get_screen',
      create: 'yodeck_create_screen',
      update: 'yodeck_update_screen',
      delete: 'yodeck_delete_screen',
    },
  });
}
