import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { YodeckClient } from '../client.js';
import { registerYodeckCrud } from './_crud.js';

export function registerWorkspaceTools(server: McpServer, client: YodeckClient): void {
  registerYodeckCrud(server, client, {
    path: 'workspaces',
    tools: {
      list: 'yodeck_list_workspaces',
      get: 'yodeck_get_workspace',
      create: 'yodeck_create_workspace',
      update: 'yodeck_update_workspace',
      delete: 'yodeck_delete_workspace',
    },
  });
}
