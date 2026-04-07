import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { YodeckClient } from '../client.js';
import { registerYodeckCrud } from './_crud.js';

export function registerScheduleTools(server: McpServer, client: YodeckClient): void {
  registerYodeckCrud(server, client, {
    path: 'schedules',
    tools: {
      list: 'yodeck_list_schedules',
      get: 'yodeck_get_schedule',
      create: 'yodeck_create_schedule',
      update: 'yodeck_update_schedule',
      delete: 'yodeck_delete_schedule',
    },
  });
}
