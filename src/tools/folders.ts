import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { YodeckClient } from '../client.js';
import { registerYodeckCrud } from './_crud.js';

export function registerFolderTools(server: McpServer, client: YodeckClient): void {
  registerYodeckCrud(server, client, {
    path: 'folders',
    tools: {
      list: 'yodeck_list_folders',
      get: 'yodeck_get_folder',
      create: 'yodeck_create_folder',
      update: 'yodeck_update_folder',
      delete: 'yodeck_delete_folder',
    },
  });
}
